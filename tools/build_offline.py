"""Build the playable single-file edition from dist/. Run with Python 3."""
from base64 import b64encode
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
CSS = re.compile(r'^\s*<link rel="stylesheet" href="([^"]+)">\s*$', re.MULTILINE)
JS = re.compile(r'^\s*<script defer src="([^"]+)"></script>\s*$', re.MULTILINE)


def asset_path(reference):
    url = urlsplit(reference)
    path = unquote(url.path)
    if (not path or url.scheme or url.netloc or url.query or url.fragment
            or path.startswith("/") or "\\" in path or ":" in path):
        raise ValueError(f"Expected a local path under dist/: {reference}")
    source = (DIST / path).resolve()
    if DIST not in source.parents:
        raise ValueError(f"Asset outside dist/: {reference}")
    return source


def inline_image(reference):
    source = asset_path(reference)
    mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
            ".webp": "image/webp"}.get(source.suffix.lower())
    if mime is None:
        raise ValueError(f"Unsupported image type: {reference}")
    data = source.read_bytes()
    signatures = {
        "image/jpeg": data.startswith(b"\xff\xd8\xff") and data.endswith(b"\xff\xd9"),
        "image/png": data.startswith(b"\x89PNG\r\n\x1a\n") and data[12:16] == b"IHDR",
        "image/webp": data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    }
    if not signatures[mime]:
        raise ValueError(f"Image contents do not match the filename: {reference}")
    return f"data:{mime};base64," + b64encode(data).decode("ascii")


class ImageInliner(HTMLParser):
    """Replace only actual img elements, preserving the rest of the source verbatim."""
    def __init__(self, html):
        super().__init__()
        self.line_starts = [0] + [m.end() for m in re.finditer("\n", html)]
        self.edits = []
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        if tag != "img":
            return
        sources = [value for name, value in attrs if name == "src"]
        if len(sources) != 1 or not sources[0] or any(name == "srcset" for name, _ in attrs):
            raise ValueError("Each img must have one local src and no srcset")
        data_url = inline_image(sources[0])
        attributes = []
        for name, value in attrs:
            if name == "src":
                value = data_url
            attributes.append(name if value is None else f'{name}="{escape(value, quote=True)}"')
        line, column = self.getpos()
        start = self.line_starts[line - 1] + column
        self.edits.append((start, start + len(self.get_starttag_text()), "<img " + " ".join(attributes) + ">"))


def main():
    html = (DIST / "index.html").read_text(encoding="utf-8")
    styles = [asset_path(path).read_text(encoding="utf-8") for path in CSS.findall(html)]
    scripts = [asset_path(path).read_text(encoding="utf-8") for path in JS.findall(html)]
    if not styles or not scripts or "</head>" not in html or "</body>" not in html:
        raise ValueError("Check stylesheet, deferred script, head and body tags in dist/index.html")

    lines = [line for line in html.splitlines(keepends=True)
             if not CSS.fullmatch(line) and not JS.fullmatch(line)]
    html = "".join(lines)
    if re.search(r'<script\b[^>]*\bsrc=|<link\b[^>]*\brel=["\']stylesheet', html, re.I):
        raise ValueError("Unsupported asset tag left in HTML; update build_offline.py")

    for start, end, replacement in reversed(ImageInliner(html).edits):
        html = html[:start] + replacement + html[end:]

    style_block = "<style>\n" + "\n".join(styles) + "\n</style>\n"
    script_blocks = "".join("<script>\n" + js + "\n</script>\n" for js in scripts)
    html = html.replace("</head>", style_block + "</head>", 1)
    html = html.replace("</body>", script_blocks + "</body>", 1)
    output = ROOT / "GT3-Pitwall-Offline.html"
    output.write_bytes(html.encode("utf-8"))
    print(output)


if __name__ == "__main__":
    main()

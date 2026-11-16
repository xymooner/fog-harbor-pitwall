"""Encode the approved full livery boards for the website without changing pixels."""
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SOURCES = {
    "peugeot": "27-warspite-peugeot-9x8.png",
    "ferrari": "16-meridian-ferrari-499p.png",
    "porsche": "06-penske-porsche-963.png",
    "alpine": "31-atlas-alpine-a424.png",
    "cadillac": "52-vela-cadillac-v-series-r.png",
    "bmw": "64-kestrel-bmw-m-hybrid-v8.png",
    "toyota": "83-northline-toyota-tr010.png",
    "aston": "007-thor-aston-martin-valkyrie.png",
    "genesis": "19-genesis-magma-gmr-001.png",
}


def main():
    destination = ROOT / "dist" / "assets" / "liveries"
    destination.mkdir(parents=True, exist_ok=True)
    for brand, filename in SOURCES.items():
        source = ROOT / "art" / "liveries" / "draft-03" / filename
        output = destination / (brand + ".webp")
        with Image.open(source) as picture:
            picture.save(output, "WEBP", lossless=True, method=6)
            with Image.open(output) as saved:
                if saved.size != picture.size or saved.convert("RGBA").tobytes() != picture.convert("RGBA").tobytes():
                    raise ValueError(f"Livery image changed during encoding: {brand}")
        print(f"{brand}: {output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()

"""
Makes "Archivo Tab": Archivo (SIL OFL 1.1, The Archivo Project Authors)
with its tabular figures made the default, so every digit is the same
width on screen, in text fields and in the PDF, and a reading never
jumps sideways as it changes.

It points the cmap entries for 0-9 at the glyphs the font's own `tnum`
feature uses, and renames the family (the OFL asks a modified font not
to use the reserved name alone). Run from the repo root:

    pip install fonttools
    python3 store/tabular-fonts.py

Reads store/fonts-src/Archivo_*.ttf (from Google Fonts), writes
assets/fonts/ArchivoTab-*.ttf.
"""
from fontTools.ttLib import TTFont

WEIGHTS = {"400Regular": "Regular", "500Medium": "Medium", "600SemiBold": "SemiBold", "700Bold": "Bold"}


def tnum_map(font):
    gsub = font["GSUB"].table
    out = {}
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag != "tnum":
            continue
        for li in fr.Feature.LookupListIndex:
            lookup = gsub.LookupList.Lookup[li]
            for st in lookup.SubTable:
                if lookup.LookupType == 7:
                    st = st.ExtSubTable
                mapping = getattr(st, "mapping", None)
                if mapping:
                    out.update(mapping)
    return out


for src, style in WEIGHTS.items():
    f = TTFont(f"store/fonts-src/Archivo_{src}.ttf")
    m = tnum_map(f)
    for table in f["cmap"].tables:
        for cp in range(0x30, 0x3A):
            g = table.cmap.get(cp)
            if g in m:
                table.cmap[cp] = m[g]
    family = "Archivo Tab"
    for rec in f["name"].names:
        if rec.nameID in (1, 16):
            rec.string = family
        elif rec.nameID == 4:
            rec.string = f"{family} {style}"
        elif rec.nameID == 6:
            rec.string = f"ArchivoTab-{style}"
        elif rec.nameID == 3:
            rec.string = f"ArchivoTab-{style}"
    f.save(f"assets/fonts/ArchivoTab-{style}.ttf")
    widths = {f["hmtx"][f.getBestCmap()[cp]][0] for cp in range(0x30, 0x3A)}
    print(style, "digit widths", sorted(widths))

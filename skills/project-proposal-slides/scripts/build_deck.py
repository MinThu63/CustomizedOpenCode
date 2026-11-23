#!/usr/bin/env python3
"""Build a .pptx deck from a JSON spec using python-pptx only.

Self-contained (no other skills needed), so it works in any agent that has
python-pptx installed. Install:  pip install python-pptx

Usage:
    python build_deck.py spec.json out.pptx

spec.json shape:
{
  "slide_size": "16:9" | "4:3",
  "slides": [
    { "title": "...", "bullets": ["...", "..."],
      "subtitle": "optional, first slide only",
      "speaker_notes": "pitch script" },
    ...   # exactly 9 entries recommended
  ]
}

Emits JSON to stdout: {"saved": <path>, "slides": <n>} on success,
or {"error": ..., "hint": ...} and exits non-zero on failure.
"""
import argparse
import json
import sys

try:
    from pptx import Presentation
    from pptx.util import Inches
except ImportError:
    print(json.dumps({"error": "python-pptx not installed",
                      "hint": "pip install python-pptx"}))
    sys.exit(1)

SIZES = {"16:9": (Inches(13.333), Inches(7.5)),
         "4:3": (Inches(10), Inches(7.5))}


def set_bullets(slide, idx, bullets):
    """Fill the placeholder at body idx with one paragraph per bullet."""
    if not bullets:
        return
    for ph in slide.placeholders:
        if ph.placeholder_format.idx == idx:
            tf = ph.text_frame
            for i, b in enumerate(bullets):
                p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
                p.text = b
            return


def main():
    ap = argparse.ArgumentParser(description="Build a .pptx from a JSON spec.")
    ap.add_argument("spec")
    ap.add_argument("out")
    args = ap.parse_args()

    with open(args.spec, encoding="utf-8") as f:
        spec = json.load(f)

    prs = Presentation()
    w, h = SIZES.get(spec.get("slide_size", "16:9"), SIZES["16:9"])
    prs.slide_width, prs.slide_height = w, h

    for i, s in enumerate(spec.get("slides", [])):
        if i == 0:
            # Title Slide layout (title + subtitle)
            slide = prs.slides.add_slide(prs.slide_layouts[0])
            if slide.shapes.title is not None:
                slide.shapes.title.text = s.get("title", "")
            parts = []
            if s.get("subtitle"):
                parts.append(s["subtitle"])
            parts += [b for b in s.get("bullets", []) if b]
            set_bullets(slide, 1, parts)
        else:
            # Title and Content layout (title + body)
            slide = prs.slides.add_slide(prs.slide_layouts[1])
            if slide.shapes.title is not None:
                slide.shapes.title.text = s.get("title", "")
            set_bullets(slide, 1, [b for b in s.get("bullets", []) if b])

        notes = (s.get("speaker_notes") or "").strip()
        if notes:
            slide.notes_slide.notes_text_frame.text = notes

    prs.save(args.out)
    print(json.dumps({"saved": args.out,
                      "slides": len(spec.get("slides", []))}))


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

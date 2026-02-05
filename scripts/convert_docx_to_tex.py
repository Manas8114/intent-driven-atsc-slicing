
import sys
import os
import re
from docx import Document
from pathlib import Path

def escape_latex_special_chars(text):
    """
    Escapes LaTeX special characters in the text.
    """
    if not text:
        return ""
    
    replacements = {
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
        '\\': r'\textbackslash{}',
    }
    
    # Use a regex to replace these characters to avoid double escaping
    # This matches any of the special characters
    pattern = re.compile('|'.join(re.escape(key) for key in replacements.keys()))
    
    return pattern.sub(lambda m: replacements[m.group(0)], text)

def convert_docx_to_tex(docx_path, tex_output_path):
    """
    Reads a DOCX file and converts it to a simplified LaTeX format.
    """
    if not os.path.exists(docx_path):
        print(f"Error: File not found: {docx_path}")
        return

    try:
        doc = Document(docx_path)
    except Exception as e:
        print(f"Error reading DOCX file: {e}")
        return

    latex_lines = []
    
    # Document Preamble
    latex_lines.append(r"\documentclass{article}")
    latex_lines.append(r"\usepackage[utf8]{inputenc}")
    latex_lines.append(r"\usepackage{graphicx}")
    latex_lines.append(r"\usepackage{hyperref}")
    latex_lines.append(r"\usepackage{amsmath}")
    latex_lines.append(r"\begin{document}")
    latex_lines.append("")

    for para in doc.paragraphs:
        style_name = para.style.name
        text = para.text.strip()
        
        if not text:
            continue

        escaped_text = escape_latex_special_chars(text)

        # Basic style mapping
        # Note: styles in DOCX can vary wildly. This is a best-effort mapping.
        if 'Heading 1' in style_name:
            latex_lines.append(f"\\section{{{escaped_text}}}")
        elif 'Heading 2' in style_name:
            latex_lines.append(f"\\subsection{{{escaped_text}}}")
        elif 'Heading 3' in style_name:
            latex_lines.append(f"\\subsubsection{{{escaped_text}}}")
        elif 'Title' in style_name:
             latex_lines.append(f"\\title{{{escaped_text}}}")
             latex_lines.append(r"\maketitle")
        elif 'List' in style_name or 'Bullet' in style_name:
             # Ideally we would detect list start/end, but for now simple handling
             latex_lines.append(r"\begin{itemize}")
             latex_lines.append(f"  \\item {escaped_text}")
             latex_lines.append(r"\end{itemize}")
        else:
            # Handle minimal run-level formatting if possible, otherwise just text
            # python-docx allows iterating over runs to find bold/italic
            # For simplicity in this first pass, we use the paragraph text.
            # If high fidelity is needed, we would iterate runs.
            
            # Let's try to add a blank line after paragraphs
            latex_lines.append(escaped_text + "\n")

    latex_lines.append(r"\end{document}")

    try:
        with open(tex_output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(latex_lines))
        print(f"Successfully converted '{docx_path}' to '{tex_output_path}'")
    except Exception as e:
        print(f"Error writing TEX file: {e}")

if __name__ == "__main__":
    # Hardcoded paths as per user request context
    input_file = r"c:\Users\msgok\OneDrive\Desktop\Project\hackathon\intent-driven-atsc-slicing\FG-AINN-I-139_Harsh_v.1 (1) (1).docx"
    output_file = r"c:\Users\msgok\OneDrive\Desktop\Project\hackathon\intent-driven-atsc-slicing\FG-AINN.tex"
    
    print(f"Converting {input_file}...")
    convert_docx_to_tex(input_file, output_file)

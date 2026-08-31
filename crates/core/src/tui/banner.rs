//! Minimalist framed header cards and status banners.
//! Brainless & Claude Code aesthetic with TrueColor gradients.

use super::theme::{Rgb, TermCaps};

pub fn render_banner(caps: &TermCaps, version: &str) {
    if !caps.is_tty && !caps.has_color {
        eprintln!("TRIBUNAL-KIT v{} — Anti-Hallucination Governance Layer", version);
        return;
    }

    let g = caps.glyphs();
    let width = caps.columns.min(84).max(64);

    let title_line = format!("{}  TRIBUNAL-KIT  v{}", "🛡️", version);
    let right_pill = "[Fortress Mode · ⚡ Rust Core]";
    
    let inner_width = width.saturating_sub(4);
    let left_len = title_line.chars().count() + 1; // +1 for emoji display width correction
    let right_len = right_pill.chars().count();
    
    let spaces = if inner_width > left_len + right_len {
        inner_width - (left_len + right_len)
    } else {
        2
    };

    let border_top = format!(
        "  {}{}{}",
        g.box_tl,
        g.box_h.repeat(inner_width + 2),
        g.box_tr
    );
    let border_bottom = format!(
        "  {}{}{}",
        g.box_bl,
        g.box_h.repeat(inner_width + 2),
        g.box_br
    );

    let colored_border_top = caps.color(Rgb::SLATE_700, &border_top);
    let colored_border_bottom = caps.color(Rgb::SLATE_700, &border_bottom);
    let pipe = caps.color(Rgb::SLATE_700, g.box_v);

    let bold_title = if caps.has_truecolor {
        // Gradient for "TRIBUNAL-KIT"
        let mut res = format!("{}  ", "🛡️");
        let name = format!("TRIBUNAL-KIT  v{}", version);
        let len = name.len() as f32;
        for (i, c) in name.chars().enumerate() {
            let ratio = i as f32 / len;
            let r = 255;
            let g_val = (105.0 + ratio * 80.0) as u8;
            let b_val = (74.0 - ratio * 30.0) as u8;
            res.push_str(&format!("\x1b[38;2;{};{};{}m\x1b[1m{}\x1b[0m", r, g_val, b_val, c));
        }
        res
    } else {
        caps.bold(&title_line)
    };

    let colored_right_pill = caps.color(Rgb::ZINC_500, right_pill);

    let subtitle = "Autonomous Anti-Hallucination Governance Layer for AI Coding Agents";
    let sub_spaces = inner_width.saturating_sub(subtitle.chars().count());
    let colored_subtitle = caps.color(Rgb::ZINC_400, subtitle);

    eprintln!();
    eprintln!("{}", colored_border_top);
    eprintln!("  {} {}{}{}{} {}", pipe, bold_title, " ".repeat(spaces), colored_right_pill, "", pipe);
    eprintln!("  {} {}{}{} {}", pipe, colored_subtitle, " ".repeat(sub_spaces), "", pipe);
    eprintln!("{}", colored_border_bottom);
    eprintln!();
}

pub fn render_section_header(caps: &TermCaps, title: &str) {
    let g = caps.glyphs();
    let prefix = caps.color(Rgb::FLAME, g.chevron);
    let bold_title = caps.bold(title);
    eprintln!("  {} {}", prefix, bold_title);
}

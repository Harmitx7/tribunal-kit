//! Terminal theme, TrueColor palette, and Unicode glyph tokens.
//! Designed to match the Brainless (Claude Code / Codex / Grok) minimalist aesthetic.

use std::env;
use std::io::IsTerminal;

#[derive(Clone, Copy, Debug)]
pub struct Rgb(pub u8, pub u8, pub u8);

impl Rgb {
    pub const SLATE_900: Rgb = Rgb(13, 13, 15);
    pub const SLATE_800: Rgb = Rgb(30, 30, 34);
    pub const SLATE_700: Rgb = Rgb(47, 47, 51);
    pub const ZINC_600: Rgb = Rgb(86, 95, 137);
    pub const ZINC_500: Rgb = Rgb(122, 122, 122);
    pub const ZINC_400: Rgb = Rgb(161, 161, 170);
    pub const ZINC_200: Rgb = Rgb(228, 228, 231);
    pub const WHITE: Rgb = Rgb(237, 237, 237);

    // Accent colors (Flame / Coral / Amber)
    pub const FLAME: Rgb = Rgb(205, 105, 74);      // #cd694a (Claude / Flame)
    pub const CORAL_BRIGHT: Rgb = Rgb(231, 148, 117); // #e79475
    pub const AMBER: Rgb = Rgb(245, 158, 11);     // #f59e0b
    pub const GOLD: Rgb = Rgb(255, 215, 0);       // #ffd700

    // Semantic status colors
    pub const EMERALD: Rgb = Rgb(78, 169, 111);   // #4ea96f (Success / Green)
    pub const CYAN: Rgb = Rgb(125, 207, 255);     // #7dcfff (Blue / Token / Accent)
    pub const ROSE: Rgb = Rgb(244, 63, 94);       // #f43f5e (Error / Red)
    pub const PURPLE: Rgb = Rgb(177, 167, 255);   // #b1a7ff (Codex Soft Purple)

    pub fn to_fg_ansi(&self) -> String {
        format!("\x1b[38;2;{};{};{}m", self.0, self.1, self.2)
    }

    pub fn to_bg_ansi(&self) -> String {
        format!("\x1b[48;2;{};{};{}m", self.0, self.1, self.2)
    }
}

pub struct Glyphs {
    pub bullet: &'static str,
    pub success: &'static str,
    pub failure: &'static str,
    pub warning: &'static str,
    pub branch: &'static str,
    pub tree_mid: &'static str,
    pub tree_end: &'static str,
    pub chevron: &'static str,
    pub diamond: &'static str,
    pub box_tl: &'static str,
    pub box_tr: &'static str,
    pub box_bl: &'static str,
    pub box_br: &'static str,
    pub box_h: &'static str,
    pub box_v: &'static str,
    pub dot: &'static str,
    pub check: &'static str,
    pub uncheck: &'static str,
}

pub const UTF8_GLYPHS: Glyphs = Glyphs {
    bullet: "⏺",
    success: "✔",
    failure: "✖",
    warning: "⚠",
    branch: "⎿",
    tree_mid: "├──",
    tree_end: "└──",
    chevron: "❯",
    diamond: "◆",
    box_tl: "╭",
    box_tr: "╮",
    box_bl: "╰",
    box_br: "╯",
    box_h: "─",
    box_v: "│",
    dot: "·",
    check: "[✔]",
    uncheck: "[ ]",
};

pub const ASCII_GLYPHS: Glyphs = Glyphs {
    bullet: "*",
    success: "+",
    failure: "x",
    warning: "!",
    branch: "\\-",
    tree_mid: "|--",
    tree_end: "`--",
    chevron: ">",
    diamond: "*",
    box_tl: "+",
    box_tr: "+",
    box_bl: "+",
    box_br: "+",
    box_h: "-",
    box_v: "|",
    dot: ".",
    check: "[x]",
    uncheck: "[ ]",
};

/// Terminal capability detector
#[derive(Debug, Clone)]
pub struct TermCaps {
    pub is_tty: bool,
    pub has_color: bool,
    pub has_truecolor: bool,
    pub has_unicode: bool,
    pub columns: usize,
}

impl TermCaps {
    pub fn probe() -> Self {
        let is_tty = std::io::stdout().is_terminal() || std::io::stderr().is_terminal();
        
        let no_color = env::var("NO_COLOR").is_ok() || env::var("CI").is_ok();
        let colorterm = env::var("COLORTERM").unwrap_or_default();
        let term = env::var("TERM").unwrap_or_default();
        
        let has_color = !no_color && (is_tty || env::var("FORCE_COLOR").is_ok());
        let has_truecolor = has_color && (colorterm == "truecolor" || colorterm == "24bit" || term.contains("256color") || term.contains("xterm") || cfg!(windows));
        
        // On Windows Terminal or UTF-8 locales, enable rich unicode
        let lang = env::var("LANG").unwrap_or_default();
        let wt = env::var("WT_SESSION").is_ok();
        let has_unicode = !no_color && (wt || lang.contains("UTF-8") || lang.contains("utf8") || !cfg!(windows) || env::var("TERM_PROGRAM").is_ok());
        
        let columns = term_columns().unwrap_or(80);

        Self {
            is_tty,
            has_color,
            has_truecolor,
            has_unicode,
            columns,
        }
    }

    pub fn glyphs(&self) -> &'static Glyphs {
        if self.has_unicode {
            &UTF8_GLYPHS
        } else {
            &ASCII_GLYPHS
        }
    }

    pub fn color(&self, rgb: Rgb, text: &str) -> String {
        if !self.has_color {
            return text.to_string();
        }
        if self.has_truecolor {
            format!("{}{}\x1b[0m", rgb.to_fg_ansi(), text)
        } else {
            // Basic 16-color ANSI fallback
            format!("\x1b[96m{}\x1b[0m", text)
        }
    }

    pub fn bold(&self, text: &str) -> String {
        if !self.has_color {
            text.to_string()
        } else {
            format!("\x1b[1m{}\x1b[0m", text)
        }
    }

    pub fn dim(&self, text: &str) -> String {
        if !self.has_color {
            text.to_string()
        } else {
            format!("\x1b[90m{}\x1b[0m", text)
        }
    }
}

fn term_columns() -> Option<usize> {
    if let Ok(col_str) = env::var("COLUMNS") {
        if let Ok(c) = col_str.parse::<usize>() {
            return Some(c);
        }
    }
    None
}

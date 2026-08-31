//! Hierarchical action tree nodes (⏺ / ⎿) matching the Brainless agent specification.

use super::theme::{Rgb, TermCaps};
use std::thread;
use std::time::Duration;

pub struct ActionTree<'a> {
    caps: &'a TermCaps,
    stagger_ms: u64,
}

impl<'a> ActionTree<'a> {
    pub fn new(caps: &'a TermCaps) -> Self {
        Self {
            caps,
            stagger_ms: if caps.is_tty { 15 } else { 0 },
        }
    }

    pub fn with_stagger(mut self, ms: u64) -> Self {
        self.stagger_ms = if self.caps.is_tty { ms } else { 0 };
        self
    }

    /// Print top-level action node: ⏺ Verb(Target)
    pub fn action(&self, verb: &str, target: Option<&str>) {
        let g = self.caps.glyphs();
        let bullet = self.caps.color(Rgb::EMERALD, g.bullet);
        let colored_verb = self.caps.color(Rgb::WHITE, &self.caps.bold(verb));

        if let Some(t) = target {
            let open_paren = self.caps.color(Rgb::ZINC_600, "(");
            let colored_target = self.caps.color(Rgb::CYAN, t);
            let close_paren = self.caps.color(Rgb::ZINC_600, ")");
            eprintln!("  {} {}{}{}{}", bullet, colored_verb, open_paren, colored_target, close_paren);
        } else {
            eprintln!("  {} {}", bullet, colored_verb);
        }

        if self.stagger_ms > 0 {
            thread::sleep(Duration::from_millis(self.stagger_ms));
        }
    }

    /// Print branch detail: ⎿ Message
    pub fn branch(&self, message: &str) {
        let g = self.caps.glyphs();
        let branch_glyph = self.caps.color(Rgb::ZINC_600, g.branch);
        let colored_msg = self.caps.color(Rgb::ZINC_400, message);
        eprintln!("    {} {}", branch_glyph, colored_msg);

        if self.stagger_ms > 0 {
            thread::sleep(Duration::from_millis(self.stagger_ms));
        }
    }

    /// Print success check item: ✔ Title ... (detail)
    pub fn item_success(&self, title: &str, detail: Option<&str>) {
        let g = self.caps.glyphs();
        let check = self.caps.color(Rgb::EMERALD, g.success);
        let colored_title = self.caps.color(Rgb::WHITE, title);
        
        if let Some(d) = detail {
            let colored_detail = self.caps.color(Rgb::ZINC_500, d);
            eprintln!("    {} {} {}", check, colored_title, colored_detail);
        } else {
            eprintln!("    {} {}", check, colored_title);
        }

        if self.stagger_ms > 0 {
            thread::sleep(Duration::from_millis(self.stagger_ms));
        }
    }

    /// Print warning item: ⚠ Message
    pub fn item_warning(&self, message: &str) {
        let g = self.caps.glyphs();
        let warn = self.caps.color(Rgb::AMBER, g.warning);
        let colored_msg = self.caps.color(Rgb::AMBER, message);
        eprintln!("    {} {}", warn, colored_msg);
    }

    /// Print error item: ✖ Message
    pub fn item_error(&self, message: &str) {
        let g = self.caps.glyphs();
        let err = self.caps.color(Rgb::ROSE, g.failure);
        let colored_msg = self.caps.color(Rgb::ROSE, message);
        eprintln!("    {} {}", err, colored_msg);
    }

    /// Print completion message: ✔ Summary
    pub fn complete(&self, message: &str) {
        let g = self.caps.glyphs();
        let check = self.caps.color(Rgb::EMERALD, g.success);
        let bold_msg = self.caps.bold(message);
        let colored = self.caps.color(Rgb::WHITE, &bold_msg);
        eprintln!();
        eprintln!("  {} {}", check, colored);
        eprintln!();
    }
}

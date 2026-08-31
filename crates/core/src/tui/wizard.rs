//! Interactive terminal multi-select wizard.
//! Allows toggling IDE bridges and agent profiles in interactive TTY sessions.

use super::theme::{Rgb, TermCaps};

pub struct SelectOption {
    pub label: &'static str,
    pub detail: &'static str,
    pub selected: bool,
}

pub struct WizardPrompt<'a> {
    caps: &'a TermCaps,
}

impl<'a> WizardPrompt<'a> {
    pub fn new(caps: &'a TermCaps) -> Self {
        Self { caps }
    }

    pub fn display_summary(&self, question: &str, options: &[SelectOption]) {
        let g = self.caps.glyphs();
        let prefix = self.caps.color(Rgb::AMBER, "?");
        let bold_q = self.caps.bold(question);
        eprintln!("  {} {}", prefix, bold_q);

        for opt in options {
            let check = if opt.selected {
                self.caps.color(Rgb::EMERALD, g.check)
            } else {
                self.caps.color(Rgb::ZINC_600, g.uncheck)
            };

            let label_colored = if opt.selected {
                self.caps.color(Rgb::WHITE, opt.label)
            } else {
                self.caps.color(Rgb::ZINC_500, opt.label)
            };

            let detail_colored = self.caps.color(Rgb::ZINC_600, opt.detail);

            eprintln!("    {} {} {}", check, label_colored, detail_colored);
        }

        let hint = "[Space] Toggle · [Enter] Confirm · [A] Select All";
        eprintln!("  {}", self.caps.color(Rgb::ZINC_600, hint));
        eprintln!();
    }
}

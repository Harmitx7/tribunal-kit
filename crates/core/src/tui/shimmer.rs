//! Shimmering gradient animation and zero-flicker Braille spinner.
//! Mirrors the Brainless CSS shimmer effect in ANSI TrueColor.

use super::theme::{Rgb, TermCaps};
use std::io::{self, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

pub struct ShimmerSpinner {
    stop_signal: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl ShimmerSpinner {
    pub fn start(caps: TermCaps, verb: &'static str, details: &'static str) -> Self {
        let stop_signal = Arc::new(AtomicBool::new(false));
        let signal_clone = stop_signal.clone();

        if !caps.is_tty || !caps.has_color {
            eprintln!("  · {} ({})", verb, details);
            return Self {
                stop_signal,
                handle: None,
            };
        }

        let handle = thread::spawn(move || {
            let start = Instant::now();
            let braille = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
            let mut frame: usize = 0;

            // Hide cursor to prevent flicker
            eprint!("\x1b[?25l");
            let _ = io::stderr().flush();

            while !signal_clone.load(Ordering::Relaxed) {
                let elapsed = start.elapsed().as_secs_f32();
                let spinner_char = braille[frame % braille.len()];
                
                // Construct shimmering verb
                let shimmer_verb = if caps.has_truecolor {
                    render_shimmer_text(verb, frame)
                } else {
                    caps.bold(verb)
                };

                let dot = caps.color(Rgb::FLAME, "·");
                let timer_text = caps.color(Rgb::ZINC_500, &format!("({:.1}s · {})", elapsed, details));
                let spin_colored = caps.color(Rgb::FLAME, spinner_char);

                // Clear current line and write in-place
                eprint!("\r\x1b[2K  {} {} {} {}", dot, spin_colored, shimmer_verb, timer_text);
                let _ = io::stderr().flush();

                frame = frame.wrapping_add(1);
                thread::sleep(Duration::from_millis(60));
            }

            // Clean line and restore cursor
            eprint!("\r\x1b[2K\x1b[?25h");
            let _ = io::stderr().flush();
        });

        Self {
            stop_signal,
            handle: Some(handle),
        }
    }

    pub fn finish(mut self, success_msg: Option<&str>, caps: &TermCaps) {
        self.stop_signal.store(true, Ordering::Relaxed);
        if let Some(h) = self.handle.take() {
            let _ = h.join();
        }
        if let Some(msg) = success_msg {
            let g = caps.glyphs();
            let check = caps.color(Rgb::EMERALD, g.success);
            let bold_msg = caps.bold(msg);
            eprintln!("  {} {}", check, caps.color(Rgb::WHITE, &bold_msg));
        }
    }
}

/// Generates a travelling TrueColor highlight wave over the string
fn render_shimmer_text(text: &str, frame: usize) -> String {
    let mut out = String::with_capacity(text.len() * 20);
    let chars: Vec<char> = text.chars().collect();
    let num_chars = chars.len() as f32;
    let wave_pos = (frame as f32 * 0.15) % (num_chars + 4.0) - 2.0;

    for (i, &c) in chars.iter().enumerate() {
        let dist = (i as f32 - wave_pos).abs();
        let intensity = (1.0 - (dist / 3.0)).clamp(0.0, 1.0);

        // Interpolate between FLAME #cd694a and bright CORAL #ffe4d6
        let r = (205.0 + intensity * 50.0) as u8;
        let g = (105.0 + intensity * 123.0) as u8;
        let b = (74.0 + intensity * 140.0) as u8;

        out.push_str(&format!("\x1b[38;2;{};{};{}m\x1b[1m{}\x1b[0m", r, g, b, c));
    }

    out
}

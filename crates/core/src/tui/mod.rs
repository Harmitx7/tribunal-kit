//! Tribunal-Kit Native Terminal User Interface (TUI) Engine.
//! Brainless & Claude Code minimalist design tokens, shimmer animations, action trees, and wizard prompts.

#![allow(dead_code)]
#![allow(unused_imports)]

pub mod theme;
pub mod banner;
pub mod tree;
pub mod shimmer;
pub mod reviewer_grid;
pub mod wizard;

pub use theme::{TermCaps, Rgb, Glyphs, UTF8_GLYPHS, ASCII_GLYPHS};
pub use banner::{render_banner, render_section_header};
pub use tree::ActionTree;
pub use shimmer::ShimmerSpinner;
pub use reviewer_grid::{render_reviewer_grid, ALL_REVIEWERS};
pub use wizard::{WizardPrompt, SelectOption};

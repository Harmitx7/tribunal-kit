//! Tribunal-Kit Native Terminal User Interface (TUI) Engine.
//! Brainless & Claude Code minimalist design tokens, shimmer animations, action trees, and wizard prompts.

#![allow(dead_code)]
#![allow(unused_imports)]

pub mod banner;
pub mod reviewer_grid;
pub mod shimmer;
pub mod theme;
pub mod tree;
pub mod wizard;

pub use banner::{render_banner, render_section_header};
pub use reviewer_grid::{render_reviewer_grid, ALL_REVIEWERS};
pub use shimmer::ShimmerSpinner;
pub use theme::{Glyphs, Rgb, TermCaps, ASCII_GLYPHS, UTF8_GLYPHS};
pub use tree::ActionTree;
pub use wizard::{SelectOption, WizardPrompt};

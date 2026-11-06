# Intentional Scroll

## About

Intentional Scroll is a Chrome extension designed to encourage more intentional social media use. It helps users stay focused on why they opened Instagram instead of automatically continuing to scroll.

Users select an intention and set a planned session duration. Once the planned time ends, the extension gradually introduces visual friction through grayscale and blur effects, along with intention-based reminders.

## Features

- Choose an intention before starting a session.
- Set a custom session duration between 1 and 180 minutes.
- Receive reminders based on the selected intention.
- Experience a three-minute grayscale stage after the planned session.
- Experience a two-minute blur stage after grayscale.
- Choose to end the session early or continue during the intervention stages.
- Automatically end the session after the intervention period.
- Export session history as a JSON file.

## Installation

1. Download or extract the `Vanishree_codebase` folder.
2. Open Google Chrome.
3. Navigate to `chrome://extensions`.
4. Enable Developer mode.
5. Select **Load unpacked**.
6. Choose the `Vanishree_codebase` folder.

## Usage

1. Open Instagram Web.
2. Open the Intentional Scroll extension.
3. Select an intention.
4. Enter the amount of time you plan to spend.
5. Start the session.
6. When the planned time ends, respond to the intention-based reminders or allow the intervention stages to finish.

## Project Structure

- `manifest.json` – Extension configuration and permissions.
- `popup.html` – Extension popup interface.
- `popup.css` – Popup styling.
- `popup.js` – Popup interactions and session initiation.
- `content.js` – Instagram page interactions, visual effects and reminders.
- `background.js` – Session timing, stage management and session history.

## Technologies Used

- HTML
- CSS
- JavaScript
- Chrome Extensions Manifest V3
- Chrome Storage API
- Chrome Alarms API

## Project Purpose

Intentional Scroll explores how intention-setting, repeated prompts and gradual visual friction can encourage more conscious social media use without immediately blocking access.
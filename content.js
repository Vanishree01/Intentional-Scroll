
/*
====================================================
INTENTIONAL SCROLL — CONTENT.JS
====================================================

This file controls what happens on Instagram:

1. Shows the session countdown.
2. Changes Instagram to grayscale after the planned time.
3. Blurs Instagram after 3 minutes of grayscale.
4. Shows repeated intention reminders.
5. Restores the page when the session ends.
*/

// 1. VARIABLES
let currentStage = "normal";
let currentIntention = "";
let timerInterval = null;

// Repeated intention reminder
let reminderTimeout = null;
let reminderVisible = false;


// 2. CREATE THE TIMER PANEL
function createTimerPanel() {

    // Avoid creating the timer more than once
    if (document.getElementById("intentional-scroll-panel")) {
        return;
    }

    const panel = document.createElement("div");
    panel.id = "intentional-scroll-panel";

    panel.innerHTML = `
        <div id="is-timer">00:00</div>
    `;

    document.body.appendChild(panel);

    const style = document.createElement("style");
    style.id = "intentional-scroll-style";

    style.textContent = `

        #intentional-scroll-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            padding: 10px 16px;
            background: #252525;
            color: white;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            box-shadow: 0 3px 14px rgba(0,0,0,0.2);
        }

        #is-timer {
            font-size: 20px;
            font-weight: bold;
            font-variant-numeric: tabular-nums;
        }

        body.intentional-scroll-grayscale
        > *:not(#intentional-scroll-panel):not(#is-reminder-overlay):not(#is-context-overlay) {
            filter: grayscale(100%) !important;
            transition: filter 1.5s ease;
        }

        body.intentional-scroll-blur
        > *:not(#intentional-scroll-panel):not(#is-reminder-overlay):not(#is-context-overlay) {
            filter: grayscale(100%) blur(4px) !important;
            transition: filter 1.5s ease;
        }

    `;

    document.head.appendChild(style);
}


// 3. TIMER FUNCTIONS
// Convert seconds into MM:SS
function formatTime(seconds) {

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );

}

// Update the visible countdown
function updateTimer(stageEnd) {
    const timer = document.getElementById("is-timer");
    if (!timer) {
        return;
    }

    const remainingSeconds = Math.max(
        0,
        Math.ceil((stageEnd - Date.now()) / 1000)
    );
    timer.textContent = formatTime(remainingSeconds);

}


// 4. INTENTION REMINDER POPUP
function showIntentionReminder() {

    // Only show reminders during grayscale and blur
    if (
        currentStage !== "grayscale" &&
        currentStage !== "blur"
    ) {
        return;
    }

    // Do not create another popup if one is already open
    if (reminderVisible) {
        return;
    }

    reminderVisible = true;

    // Match the reminder to the selected intention
    const reminderMessages = {
        messages: "Have you finished replying to your messages?",
        notifications: "Have you checked the notifications you came for?",
        search: "Did you find what you were looking for?",
        break: "Are you still enjoying your break?"
    };

    const reminderMessage =
        reminderMessages[currentIntention] ||
        "Are you still using Instagram for your original purpose?";

    const overlay = document.createElement("div");
    overlay.id = "is-reminder-overlay";

    overlay.innerHTML = `
        <div id="is-reminder-card">

            <h2>Your planned time is over.</h2>

            <p id="is-reminder-message">${reminderMessage}</p>

            <div id="is-reminder-buttons">
                <button id="is-reminder-yes">Yes, I'm done</button>
                <button id="is-reminder-no">No, continue</button>
            </div>

        </div>
    `;

    const style = document.createElement("style");
    style.id = "is-reminder-style";

    style.textContent = `

        #is-reminder-overlay {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.35);
            font-family: Arial, sans-serif;
        }

        #is-reminder-card {
            width: 340px;
            padding: 25px;
            box-sizing: border-box;
            background: #f5f3ef;
            color: #252525;
            border-radius: 14px;
            box-shadow: 0 8px 35px rgba(0,0,0,0.3);
            text-align: center;
        }

        #is-reminder-card h2 {
            font-size: 21px;
            line-height: 1.4;
            margin: 0 0 12px;
        }

        #is-reminder-card p {
            font-size: 14px;
            line-height: 1.5;
            color: #666;
            margin-bottom: 20px;
        }

        #is-reminder-buttons {
            display: flex;
            gap: 10px;
        }

        #is-reminder-buttons button {
            flex: 1;
            padding: 12px 8px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
        }

        #is-reminder-yes {
            background: #252525;
            color: white;
        }

        #is-reminder-no {
            background: #dedbd5;
            color: #252525;
        }

        #is-reminder-buttons button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    const yesButton = document.getElementById("is-reminder-yes");
    const noButton = document.getElementById("is-reminder-no");

    // YES: End the session immediately
    yesButton.addEventListener("click", async function() {

        yesButton.disabled = true;
        noButton.disabled = true;

        try {

            const response = await chrome.runtime.sendMessage({
                type: "END_SESSION_EARLY"
            });

            if (!response || !response.success) {
                throw new Error("Could not end the session.");
            }

        } catch (error) {

            console.error(error);

            document.getElementById("is-reminder-message").textContent =
                "Something went wrong. Please try again.";

            yesButton.disabled = false;
            noButton.disabled = false;

        }

    });

    // NO: Continue using Instagram in the current visual stage
    noButton.addEventListener("click", function() {

        overlay.remove();
        style.remove();

        reminderVisible = false;

        // Remind the user again after 10 seconds
        reminderTimeout = setTimeout(function() {

            reminderTimeout = null;
            showIntentionReminder();

        }, 10000);

    });

}


// Stop all repeated reminders
function stopIntentionReminders() {

    if (reminderTimeout) {
        clearTimeout(reminderTimeout);
        reminderTimeout = null;
    }

    const overlay = document.getElementById("is-reminder-overlay");
    const style = document.getElementById("is-reminder-style");

    if (overlay) {
        overlay.remove();
    }

    if (style) {
        style.remove();
    }

    reminderVisible = false;

}


// 5. APPLY THE CURRENT STAGE
function applyStage(data) {

    createTimerPanel();

    currentStage = data.stage || "normal";
    currentIntention = data.intention || "";
    console.log("Selected intention:", currentIntention);

    const timer = document.getElementById("is-timer");

    // Remove previous visual effects
    document.body.classList.remove(
        "intentional-scroll-grayscale",
        "intentional-scroll-blur"
    );

    // Stop the previous countdown
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }



    // STAGE 1: NORMAL

    if (currentStage === "normal") {

        stopIntentionReminders();
        timer.style.display = "block";

    }

    
    // STAGE 2: GRAYSCALE

    else if (currentStage === "grayscale") {

        timer.style.display = "block";

        document.body.classList.add(
            "intentional-scroll-grayscale"
        );

        // Show the first reminder immediately
        if (!reminderVisible && !reminderTimeout) {
            showIntentionReminder();
        }

    }


    // STAGE 3: BLUR

    else if (currentStage === "blur") {

        timer.style.display = "block";

        document.body.classList.add(
            "intentional-scroll-blur"
        );

        // Continue the same reminder cycle
        if (!reminderVisible && !reminderTimeout) {
            showIntentionReminder();
        }
    }


    // START THE COUNTDOWN

    if (
        data.stageEnd &&
        (
            currentStage === "normal" ||
            currentStage === "grayscale" ||
            currentStage === "blur"
        )
    ) {

        updateTimer(data.stageEnd);

        timerInterval = setInterval(function() {

            updateTimer(data.stageEnd);

        }, 500);

    }

}



// 6. CONTEXTUAL PROMPT
function createContextPrompt() {

    // Do not create the prompt more than once
    if (document.getElementById("is-context-overlay")) {
        return;
    }

    const overlay = document.createElement("div");
    overlay.id = "is-context-overlay";

    overlay.innerHTML = `

        <div id="is-context-card">

            <h2>Intentional Scroll</h2>

            <p>What brings you here today?</p>

            <select id="is-intention">
                <option value="">Select your intention</option>
                <option value="messages">Reply to messages</option>
                <option value="notifications">Check notifications</option>
                <option value="search">Search for something</option>
                <option value="break">Take a short break</option>
            </select>

            <p>How much time do you want to spend?</p>

            <div id="is-time-container">

                <input
                    type="number"
                    id="is-time"
                    min="1"
                    max="180"
                    value="10"
                >

                <span>minutes</span>

            </div>

            <button id="is-start-session">
                Start Session
            </button>

            <p id="is-prompt-status"></p>

        </div>

    `;

    document.body.appendChild(overlay);
    const style = document.createElement("style");
    style.id = "is-context-style";

    style.textContent = `

        #is-context-overlay {
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(0, 0, 0, 0.45);
            font-family: Arial, sans-serif;
        }

        #is-context-card {
            width: 340px;
            padding: 28px;
            box-sizing: border-box;
            background: #f5f3ef;
            color: #252525;
            border-radius: 16px;
            box-shadow: 0 8px 35px rgba(0,0,0,0.2);
        }

        #is-context-card h2 {
            margin: 0 0 22px;
            font-size: 23px;
        }

        #is-context-card p {
            font-size: 13px;
            margin: 16px 0 8px;
            color: #555;
        }

        #is-context-card select,
        #is-context-card input {
            width: 100%;
            padding: 12px;
            box-sizing: border-box;
            border: 1px solid #777;
            border-radius: 8px;
            background: #fff;
            color: #252525;
            font-size: 14px;
            color-scheme: light;
        }

        #is-context-card input {
            font-weight: 600;
        }

        #is-time-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #is-time-container input {
            width: 90px;
        }

        #is-time-container span {
            font-size: 13px;
            color: #252525;
        }

        #is-start-session {
            width: 100%;
            margin-top: 22px;
            padding: 13px;
            border: none;
            border-radius: 8px;
            background: #252525;
            color: white;
            font-size: 14px;
            cursor: pointer;
        }

        #is-start-session:hover {
            background: #444;
        }

        #is-prompt-status {
            min-height: 15px;
            margin-bottom: 0;
        }

    `;

    document.head.appendChild(style);
    const startButton = document.getElementById("is-start-session");

    startButton.addEventListener("click", async function() {

        const intention = document.getElementById("is-intention").value;

        const duration = Number(
            document.getElementById("is-time").value
        );

        const status = document.getElementById("is-prompt-status");

        if (!intention) {
            status.textContent = "Please select your intention.";
            return;
        }

        if (
            !Number.isInteger(duration) ||
            duration < 1 ||
            duration > 180
        ) {
            status.textContent = "Enter a whole number between 1 and 180.";
            return;
        }

        startButton.disabled = true;
        status.textContent = "Starting your session...";

        try {

            const response = await chrome.runtime.sendMessage({

                type: "START_SESSION",
                intention: intention,
                duration: duration

            });

            if (!response || !response.success) {
                throw new Error("Could not start session.");
            }

            overlay.remove();
            style.remove();

        } catch (error) {

            console.error(error);

            status.textContent = "Could not start. Please try again.";
            startButton.disabled = false;

        }

    });

}


// 7. RESET THE PAGE
function resetInactivePage(showPrompt = true) {

    // Stop all repeated reminders
    stopIntentionReminders();

    // Return Instagram to its normal appearance
    document.body.classList.remove(
        "intentional-scroll-grayscale",
        "intentional-scroll-blur"
    );

    // Stop the countdown
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Remove the timer panel
    const panel = document.getElementById("intentional-scroll-panel");

    if (panel) {
        panel.remove();
    }

    // Remove the timer styling
    const timerStyle = document.getElementById(
        "intentional-scroll-style"
    );

    if (timerStyle) {
        timerStyle.remove();
    }

    // Remove any old contextual prompt
    const oldPrompt = document.getElementById("is-context-overlay");
    const oldPromptStyle = document.getElementById("is-context-style");

    if (oldPrompt) {
        oldPrompt.remove();
    }

    if (oldPromptStyle) {
        oldPromptStyle.remove();
    }

    currentStage = "normal";

    // Only show the prompt when requested
    if (showPrompt) {
        createContextPrompt();
    }

}


// 8. LOAD THE SAVED SESSION
async function loadSession(allowFinalStage = false) {

    const data = await chrome.storage.local.get([

        "stage",
        "stageEnd",
        "sessionStart",
        "sessionActive",
        "intention"

    ]);

    // If there is no active session
    if (!data.sessionActive) {

        // When the current session finishes,
        // reset the page without showing another prompt
        if (
            allowFinalStage &&
            data.stage === "completed"
        ) {

            resetInactivePage(false);
            return;

        }

        // On a fresh Instagram visit, show the prompt
        resetInactivePage();
        return;

    }

    // Apply the current active stage
    applyStage(data);

}


// 9. WATCH FOR SESSION CHANGES
chrome.storage.onChanged.addListener(function(changes, areaName) {

    if (areaName !== "local") {
        return;
    }

    if (
        changes.stage ||
        changes.stageEnd ||
        changes.sessionStart ||
        changes.sessionActive
    ) {

        loadSession(true);

    }

});


// 10. START WHEN INSTAGRAM IS READY
function startExtension() {

    loadSession();

}

// Wait until Instagram's page is ready
if (document.body) {

    startExtension();

} else {

    document.addEventListener(
        "DOMContentLoaded",
        startExtension,
        { once: true }
    );

}
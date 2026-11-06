
/*
====================================================
INTENTIONAL SCROLL — BACKGROUND.JS
====================================================

This file:

1. Records session information.
2. Controls the session stages.
3. Schedules stage transitions.
4. Handles early session completion.
5. Closes Instagram when the session finishes.
*/

// 1. STAGE DURATIONS
// Grayscale lasts 3 minutes
const GRAYSCALE_DURATION = 3 * 60 * 1000;

// Blur lasts 2 minutes
const BLUR_DURATION = 2 * 60 * 1000;


// 2. RECORD SESSION EVENTS
async function recordStageEvent(
    sessionId,
    stage,
    timestamp,
    completionReason = "planned_time_elapsed"
) {

    const data = await chrome.storage.local.get("sessionHistory");
    const history = data.sessionHistory || [];

    // Find the current session
    const session = history.find(function(item) {
        return item.sessionId === sessionId;
    });

    if (!session) {
        return;
    }

    // Record the event
    session.events.push({

        event: stage === "completed"
            ? (completionReason === "ended_early"
                ? "session_ended_early"
                : "session_completed")
            : "stage_started",

        stage: stage,
        timestamp: timestamp

    });

    // Save completion information
    if (stage === "completed") {

        session.completedAt = timestamp;
        session.totalDurationMs =
            timestamp - session.startedAt;

        session.actualDurationMinutes =
            Number((session.totalDurationMs / 60000).toFixed(2));

        session.completed = true;
        session.completionReason = completionReason;

    }

    await chrome.storage.local.set({
        sessionHistory: history
    });
}


// 3. UPDATE THE CURRENT STAGE
async function updateStage() {

    const data = await chrome.storage.local.get([

        "sessionEnd",
        "sessionStart",
        "sessionId",
        "sessionTabId",
        "stage"

    ]);

    if (!data.sessionEnd || !data.sessionId) {
        return;
    }

    const now = Date.now();
    const grayscaleEnd =
        data.sessionEnd + GRAYSCALE_DURATION;

    const blurEnd =
        grayscaleEnd + BLUR_DURATION;

    let newStage;
    let newStageEnd;

    // STAGE 1: NORMAL
    if (now < data.sessionEnd) {

        newStage = "normal";
        newStageEnd = data.sessionEnd;

    }

    // STAGE 2: GRAYSCALE
    else if (now < grayscaleEnd) {

        newStage = "grayscale";
        newStageEnd = grayscaleEnd;
    }

    // STAGE 3: BLUR
    else if (now < blurEnd) {
        newStage = "blur";
        newStageEnd = blurEnd;
    }

    // STAGE 4: COMPLETED
    else {
        newStage = "completed";
        newStageEnd = null;
    }

    // Avoid recording the same stage twice
    if (newStage === data.stage) {
        return;
    }

    // Record the stage transition
    await recordStageEvent(
        data.sessionId,
        newStage,
        now
    );

    // Save the new stage
    await chrome.storage.local.set({

        stage: newStage,
        stageEnd: newStageEnd,
        sessionActive: newStage !== "completed"

    });

    // Close only the Instagram tab used for this session
    if (newStage === "completed" && data.sessionTabId) {

        try {
            await chrome.tabs.remove(data.sessionTabId);

        } catch (error) {

            console.log("Instagram tab was already closed.");
        }
    }

    // Clear previous alarms
    await chrome.alarms.clear("sessionEnd");
    await chrome.alarms.clear("grayscaleEnd");
    await chrome.alarms.clear("blurEnd");

    // Schedule the next stage
    if (newStage === "normal") {
        chrome.alarms.create("sessionEnd", {
            when: newStageEnd
        });

    } else if (newStage === "grayscale") {
        chrome.alarms.create("grayscaleEnd", {
            when: newStageEnd
        });

    } else if (newStage === "blur") {
        chrome.alarms.create("blurEnd", {
            when: newStageEnd
        });
    }
}


// 4. END SESSION EARLY
async function endSessionEarly(sender) {

    const data = await chrome.storage.local.get([

        "sessionId",
        "sessionTabId",
        "sessionActive"
    ]);

    // Check that a session is currently active
    if (
        !data.sessionActive ||
        !data.sessionId ||
        !data.sessionTabId
    ) {
        return {
            success: false
        };
    }

    // Make sure the request came from the session's Instagram tab
    if (
        !sender.tab ||
        sender.tab.id !== data.sessionTabId
    ) {

        return {
            success: false
        };

    }

    const now = Date.now();

    // Record early completion in session history
    await recordStageEvent(
        data.sessionId,
        "completed",
        now,
        "ended_early"
    );

    // Mark the session as completed
    await chrome.storage.local.set({

        stage: "completed",
        stageEnd: null,
        sessionActive: false
    });

    // Cancel all remaining stage alarms
    await chrome.alarms.clear("sessionEnd");
    await chrome.alarms.clear("grayscaleEnd");
    await chrome.alarms.clear("blurEnd");

    // Close the Instagram tab
    try {
        await chrome.tabs.remove(data.sessionTabId);
    } catch (error) {

        console.log("Instagram tab was already closed.");
    }

    return {
        success: true
    };

}


// 5. LISTEN FOR STAGE ALARMS
chrome.alarms.onAlarm.addListener(function(alarm) {
    if (
        alarm.name === "sessionEnd" ||
        alarm.name === "grayscaleEnd" ||
        alarm.name === "blurEnd"
    ) {

        updateStage();

    }
});


// 6. CHECK SESSION WHEN CHROME STARTS
chrome.runtime.onStartup.addListener(function() {

    updateStage();

});


// 7. HANDLE MESSAGES
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    // YES BUTTON: END SESSION EARLY
    if (request.type === "END_SESSION_EARLY") {

        endSessionEarly(sender)

            .then(function(response) {
                sendResponse(response);
            })

            .catch(function(error) {
                console.error(error);

                sendResponse({
                    success: false
                });
            });
        return true;
    }


    // START SESSION FROM INSTAGRAM PROMPT
    if (request.type !== "START_SESSION") {
        return;
    }

    (async function() {

        const intention = request.intention;
        const duration = Number(request.duration);

        // Check the session details
        if (
            !intention ||
            !Number.isInteger(duration) ||
            duration < 1 ||
            duration > 180 ||
            !sender.tab ||
            !sender.tab.id
        ) {
            throw new Error("Invalid session details.");
        }

        const startTime = Date.now();
        const endTime =
            startTime + duration * 60 * 1000;
        const sessionId = "session_" + startTime;


        // Clear alarms from an earlier session
        await chrome.alarms.clear("sessionEnd");
        await chrome.alarms.clear("grayscaleEnd");
        await chrome.alarms.clear("blurEnd");


        // Get previous session records
        const data = await chrome.storage.local.get("sessionHistory");
        const history = data.sessionHistory || [];

        // Create the new session record
        history.push({

            sessionId: sessionId,
            intention: intention,
            plannedDurationMinutes: duration,
            startedAt: startTime,
            plannedEndAt: endTime,
            completedAt: null,
            totalDurationMs: null,
            actualDurationMinutes: null,
            completed: false,

            events: [
                {
                    event: "session_started",
                    stage: "normal",
                    timestamp: startTime
                },

                {
                    event: "stage_started",
                    stage: "normal",
                    timestamp: startTime
                }
            ]

        });


        // Save the session and its Instagram tab ID
        await chrome.storage.local.set({

            sessionHistory: history,
            sessionId: sessionId,
            intention: intention,
            timeLimit: duration,
            sessionStart: startTime,
            sessionEnd: endTime,
            stage: "normal",
            stageEnd: endTime,
            sessionActive: true,
            sessionTabId: sender.tab.id

        });


        // Start the countdown alarm
        chrome.alarms.create("sessionEnd", {
            when: endTime
        });


        sendResponse({
            success: true
        });

    })().catch(function(error) {
        console.error(error);
        sendResponse({
            success: false
        });

    });
    return true;
});
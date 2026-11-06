// Get the elements from the popup
const intentionInput = document.getElementById("intention");
const timeInput = document.getElementById("timeLimit");
const startButton = document.getElementById("startButton");
const statusMessage = document.getElementById("status");
const exportButton = document.getElementById("exportButton");


// Start a new session when the user clicks Start
startButton.addEventListener("click", async function() {

    const selectedIntention = intentionInput.value;
    const selectedTime = Number(timeInput.value);

    // Check that an intention was selected
    if (selectedIntention === "") {

        statusMessage.textContent =
            "Please select your intention.";

        return;
    }

    // Check that the time is valid
    if (
        !Number.isInteger(selectedTime) ||
        selectedTime < 1 ||
        selectedTime > 180
    ) {

        statusMessage.textContent =
            "Enter a whole number between 1 and 180 minutes.";

        return;
    }

    // Record the session start and end times
    const startTime = Date.now();

    const endTime =
        startTime + selectedTime * 60 * 1000;

    const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });
    // Give this session a unique ID
    const sessionId = "session_" + startTime;

    if (!activeTab || !activeTab.url || !activeTab.url.includes("instagram.com")) {
    statusMessage.textContent = "Please open Instagram before starting.";
    return;
}

    // Clear alarms from an earlier session
    await chrome.alarms.clear("sessionEnd");
    await chrome.alarms.clear("grayscaleEnd");
    await chrome.alarms.clear("blurEnd");


    // Get previous session records
    const data = await chrome.storage.local.get("sessionHistory");

    const history = data.sessionHistory || [];


    // Create a new session record
    const newSession = {

        sessionId: sessionId,

        intention: selectedIntention,

        plannedDurationMinutes: selectedTime,

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

    };


    // Add the new session to the history
    history.push(newSession);


    // Save the session information
    await chrome.storage.local.set({

        sessionHistory: history,

        sessionId: sessionId,

        intention: selectedIntention,

        timeLimit: selectedTime,

        sessionStart: startTime,

        sessionEnd: endTime,

        stage: "normal",

        stageEnd: endTime,

        sessionActive: true,
        
        sessionTabId: activeTab.id
    });


    // Start the countdown alarm
    chrome.alarms.create("sessionEnd", {
        when: endTime
    });


    statusMessage.textContent =
        "Your session has started!";

});


// Export all recorded sessions as a JSON file
exportButton.addEventListener("click", async function() {

    const data = await chrome.storage.local.get("sessionHistory");

    const history = data.sessionHistory || [];


    // Do not export an empty file
    if (history.length === 0) {

        statusMessage.textContent =
            "No session data to export yet.";

        return;
    }


    // Convert the session history into JSON
    const jsonData = JSON.stringify(history, null, 2);


    // Create a downloadable JSON file
    const file = new Blob(
        [jsonData],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(file);


    // Create a temporary download link
    const link = document.createElement("a");

    link.href = url;
    link.download = "intentional-scroll-data.json";

    link.click();


    // Release the temporary file URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);


    statusMessage.textContent =
        "Your session data has been exported!";

});
export interface TickTickTask {
    title: string;
    content?: string;
    projectId?: string;
    dueDate?: string; // ISO 8601
    tags?: string[];
}

const TICKTICK_TIMEOUT_MS = 20_000;

export async function createTickTickTask(task: TickTickTask, accessToken: string): Promise<void> {
    // Last line of defence: a blank title must never reach the API, no matter
    // which caller got there. Empty tasks are unfixable noise in the Inbox.
    const title = task.title?.trim();
    if (!title) {
        throw new Error('Cannot create an empty task.');
    }

    // Base URL for TickTick Open API v1
    const baseUrl = 'https://api.ticktick.com/open/v1';

    // Without a timeout a stalled request hangs on PROCESSING forever (no buttons)
    // and the draft is stranded. Abort after TICKTICK_TIMEOUT_MS.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TICKTICK_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${baseUrl}/task`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...task, title }),
            signal: controller.signal
        });
    } catch (err) {
        if (controller.signal.aborted) {
            throw new Error('Timed out talking to TickTick');
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        let errorMessage = 'Failed to create TickTick task';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch {
            // Ignore parse error
        }
        throw new Error(errorMessage);
    }

    // A 2xx is not proof the task was created. TickTick returns the new task with
    // an id; a 200 with no task body would otherwise flash TASK ADDED with confetti
    // and clear the draft for something that was never saved. Require the id.
    let created: { id?: string } | null = null;
    try {
        created = await response.json();
    } catch {
        created = null;
    }
    if (!created || !created.id) {
        throw new Error('TickTick said OK but returned no task');
    }
}

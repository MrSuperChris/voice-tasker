export interface TickTickTask {
    title: string;
    content?: string;
    projectId?: string;
    dueDate?: string; // ISO 8601
}

export async function createTickTickTask(task: TickTickTask, accessToken: string): Promise<void> {
    // Base URL for TickTick Open API v1
    const baseUrl = 'https://api.ticktick.com/open/v1';

    const response = await fetch(`${baseUrl}/task`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
    });

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
}

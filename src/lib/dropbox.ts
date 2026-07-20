export async function uploadObsidianNote(text: string, accessToken: string): Promise<string> {
    const created = new Date();
    // Filename: short slug from the first words + date, e.g. remember-to-check-the-2026-07-19.md
    const slug = text.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '')
        .split(/\s+/).filter(Boolean).slice(0, 6).join('-').slice(0, 60) || 'babel-note';
    const path = `/Obsidian/Ideas/${slug}-${created.toISOString().slice(0, 10)}.md`;
    const body = `---\ncreated: ${created.toISOString()}\nsource: babel\n---\n\n${text.trim()}\n`;

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            // Slug is a-z0-9- only, so this header stays ASCII-safe.
            'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true, mute: true }),
            'Content-Type': 'application/octet-stream'
        },
        body
    });

    if (!response.ok) {
        let message = 'Obsidian note upload failed';
        try {
            const err = await response.json();
            message = err.error_summary || message;
        } catch { /* non-JSON error body */ }
        throw new Error(message);
    }
    return path;
}

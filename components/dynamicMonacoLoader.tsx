import { useEffect } from "react";
import { runClient } from "@/components/MonacoEditor.ts";

export default function LoadMonaco() {
    useEffect(() => {
        // This function will run once after the component mounts,
        // because of the empty dependency array [].
        const initializeEditor = async () => {
            try {
                console.log("Attempting to initialize Monaco Editor...");
                await runClient();
                console.log("Monaco Editor and Language Client should be initialized.");
            } catch (error) {
                console.error("Failed to initialize Monaco Editor:", error);
            }
        };

        initializeEditor();

        // Optional: Cleanup function
        // This will run when the component unmounts.
        // You might need to expose a 'dispose' or 'stop' function from MonacoEditor.ts
        // to properly clean up resources (e.g., editor instance, language client).
        return () => {
            console.log("IDE component unmounting. Cleaning up editor...");
            // Example: If runClient returned the editor instance and client wrapper:
            // editorInstance?.dispose();
            // languageClientWrapper?.stop();

            // For now, just clear the container as a basic step.
            // Proper disposal needs access to Monaco/LC instances.
            const editorRoot = document.getElementById("monaco-editor-root");
            if (editorRoot) {
                // editorRoot.innerHTML = ""; // This just clears, doesn't dispose Monaco resources
                // Monaco typically handles its own disposal if you call editor.dispose()
                // This is a placeholder for more specific cleanup.
            }
        };
    }, []);

    return null;
}

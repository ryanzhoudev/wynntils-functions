"use client"; // This directive is important for the page component

import dynamic from "next/dynamic";

const DynamicHeader = dynamic(() => import("@/components/dynamicMonacoLoader"), {
    loading: () => <p>Loading IDE...</p>,
    ssr: false,
});

export default function FunctionIDE() {
    return (
        <>
            <DynamicHeader />
            {/* This div is where Monaco Editor will be mounted by runClient */}
            <div
                id="monaco-editor-root"
                style={{
                    height: "80vh",
                    width: "100%",
                    border: "1px solid #ccc",
                }} // Added some style for visibility
            >
                {/* Monaco Editor will be injected here by runClient */}
            </div>
        </>
    );
}

export default function Home() {
    return (
        <div>
            <div className="text-white ml-2">
                <h1 className="text-2xl">Welcome to the unofficial Artemis info function docs!</h1>
                <br></br>
                <h1 className="text-2xl">Click on one of the sidebar options to jump to docs or the IDE.</h1>
                <br></br> <br></br>
                <p className="text-xl">This is a work in progress, especially the IDE part.</p>
                <p className="text-xl">
                    If you have any suggestions, please contact me on Discord at <code>DonkeyBlaster#4051</code>.
                </p>
                <br></br>
                <ul>
                    Planned for the IDE:
                    <li>- Some kind of indenter system, with a &quot;click to copy minified for game&quot; button</li>
                    <li>- Bracket pair detection/highlights</li>
                    <li>- A preview window</li>
                </ul>
            </div>
        </div>
    );
}

import { describe, expect, it } from "vitest";
import { createCatalogFromResponse } from "@/lib/ide/browser-lsp/catalog";
import { buildDiagnostics } from "@/lib/ide/browser-lsp/diagnostics";
import { createTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { testCatalog, testFunction } from "@/tests/fixtures/catalog";

const regressionCorpus = `Teleport Scrolls: {tp_scroll_charges} {if(eq(tp_scroll_timer; -1); ""; concat("("; tp_scroll_timer; ")"))}

{switch(1; "asdf default"; [1, "asdf1", 2, "asdf2"])}

{accessory_durability("Ring_1")}


{if(gte(recast_ticks; 60);
    with_color(with_font(st(from_codepoint(
        if(eq(curr(powder_special_charge);100);
            57348; 57347)));"common");
        if(eq(curr(powder_special_charge);100);
            rainbow_shader;
            if(eq(curr(held_cd);0);
                from_hex("#ffffff");
                from_hex("#2b2b2b"))));
    with_color(with_font(st(from_codepoint(
        switch(int(clamp(recast_count; 0; 3)); 57356;
            1; 57356;
            2; 57367;
            3; 57379
            ))); "tooltip/identification/meter");
        if(eq(curr(powder_special_charge);100);
        if(eq(curr(held_cd);0);
                rainbow_shader; from_hex("#2b2b2b"));
        switch(int(clamp(recast_count; 0; 3)); from_hex("#8fe9ff");
                1; from_hex("#ffff00");
                2; from_hex("#ff0000");
                3; from_hex("#311376"))
                )))}

{if(lt(sub(int(add(div(current_distortion;20);1));int(div(ticks_since_specific_spell("Meteor");5)));0);
to_background_text("Meteor"; from_hex("#cecece");from_hex("#686868"); "PILL"; "PILL");
concat(to_background_text("Meteor"; from_hex("#000000");from_hex("#f34242"); "PILL"; "PILL"); " ";
to_fancy_text(str(int(sub(int(add(div(current_distortion;20);1));int(div(ticks_since_specific_spell("Meteor");5))))));" / ";to_fancy_text(str(int(add(div(current_distortion;20);1))))))}`;

function genericFunction(name: string, aliases: string[] = [], returnType = "Any") {
    return testFunction(name, returnType, [{ name: "values", type: "List" }], { aliases });
}

function createRegressionCatalog() {
    const genericNames = [
        "tp_scroll_charges",
        "if",
        "eq",
        "tp_scroll_timer",
        "concat",
        "gte",
        "recast_ticks",
        "with_color",
        "with_resource_font",
        "styled_text",
        "from_codepoint",
        "curr",
        "powder_special_charge",
        "rainbow_shader",
        "held_cd",
        "from_hex",
        "integer",
        "clamp",
        "recast_count",
        "lt",
        "sub",
        "add",
        "div",
        "current_distortion",
        "ticks_since_specific_spell",
        "to_fancy_text",
        "str",
    ];
    const functions = genericNames.map((name) => {
        if (name === "with_resource_font") return genericFunction(name, ["with_font"]);
        if (name === "styled_text") return genericFunction(name, ["st"]);
        if (name === "integer") return genericFunction(name, ["int"]);
        if (name === "from_hex") return genericFunction(name, [], "CustomColor");
        return genericFunction(name);
    });

    functions.push(
        testFunction(
            "switch_case",
            "Object",
            [
                { name: "switch", type: "Object" },
                { name: "default", type: "Object" },
                { name: "cases", type: "List" },
            ],
            { aliases: ["switch"] },
        ),
        testFunction("accessory_durability", "CappedValue", [
            { name: "accessory", type: "String", description: "One of Ring_1, Ring_2, Bracelet, Necklace" },
        ]),
        testFunction("to_background_text", "String", [
            { name: "text", type: "String" },
            { name: "textColor", type: "CustomColor" },
            { name: "backgroundColor", type: "CustomColor" },
            { name: "leftEdge", type: "String", description: "NONE, PILL, BOX, FLAG, RIBBON" },
            { name: "rightEdge", type: "String", description: "NONE, PILL, BOX, FLAG, RIBBON" },
        ]),
    );

    return testCatalog(functions);
}

describe("regression corpus", () => {
    it("keeps all supplied production expressions diagnostic-free", () => {
        const document = createTextDocument("test://regressions", regressionCorpus);
        const result = buildDiagnostics(document, createCatalogFromResponse(createRegressionCatalog()));

        expect(result).toEqual([]);
    });
});

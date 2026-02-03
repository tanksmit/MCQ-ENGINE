
function cleanJSONResponse(text) {
    if (!text) return "";
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    text = text.replace(/\\(?![/\\bfnrtu"]|u[0-9a-fA-F]{4})/g, '\\\\');
    return text;
}

const testCases = [
    {
        name: "LaTeX symbols (simple)",
        input: String.raw`[{"explanation": "This uses \alpha for math."}]`
    },
    {
        name: "LaTeX symbols (with t)",
        input: String.raw`[{"explanation": "This uses \times for math."}]`
    },
    {
        name: "Valid escapes",
        input: String.raw`[{"explanation": "Line 1\nLine 2\tTabbed \"Quotes\" \\ Backslash"}]`
    },
    {
        name: "AI failure case (from log)",
        input: String.raw`[{"Q_No": 1, "Explanation": "numbers \le 60.\nGLB"}]`
    }
];

console.log("Starting JSON Sanitization Tests...\n");

let passed = 0;
testCases.forEach(tc => {
    const result = cleanJSONResponse(tc.input);
    try {
        JSON.parse(result);
        console.log(`✅ Passed: ${tc.name}`);
        passed++;
    } catch (e) {
        console.log(`❌ Failed: ${tc.name}`);
        console.log(`   Result: ${result}`);
        console.log(`   Error: ${e.message}`);
    }
});

console.log(`\nTests Completed: ${passed}/${testCases.length} passed.`);
process.exit(passed === testCases.length ? 0 : 1);

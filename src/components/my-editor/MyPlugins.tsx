import { autoComplete } from "@/lib/model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { marked } from "marked";
import { DOMParser, Fragment } from "prosemirror-model";
import { defaultMarkdownSerializer } from "prosemirror-markdown";

export function placeholderPlugin(placeholderText: string) {
  return new Plugin({
    props: {
      decorations(state) {
        const docEmpty =
          state.doc.childCount === 1 &&
          state.doc.firstChild?.isTextblock &&
          state.doc.firstChild.content.size === 0;
        if (!docEmpty) return null;

        const deco = document.createElement("span");
        deco.className = "editor-placeholder";
        deco.textContent = placeholderText;

        const from = 1;
        return DecorationSet.create(state.doc, [
          Decoration.widget(from, () => deco),
        ]);
      },
    },
  });
}

export function autocompletePlugin(schema: any) {
  let decorationSet: DecorationSet | null = null;
  let isAutocompleteActive = false;
  let currentSuggestion = "";
  let timeoutId: NodeJS.Timeout | null = null;

  return new Plugin({
    props: {
      decorations: () => decorationSet,
      handleKeyDown(view, event) {
        // If any key is pressed (except Tab) and autocomplete is active, clear it
        if (event.key !== "Tab" && isAutocompleteActive) {
          decorationSet = null;
          isAutocompleteActive = false;
          view.dispatch(view.state.tr);
          return false;
        }

        if (event.key === "Tab") {
          const state = view.state;
          const { from } = state.selection;

          if (isAutocompleteActive) {
            event.preventDefault();
            decorationSet = null;
            isAutocompleteActive = false;

            // Preserve leading space before parsing (HTML parsing strips it)
            const hasLeadingSpace = /^\s/.test(currentSuggestion);
            const suggestionToMarse = currentSuggestion.trim();

            const html = marked.parse(suggestionToMarse) as string;
            const temp = document.createElement("div");
            temp.innerHTML = html;
            const parsedDoc = DOMParser.fromSchema(schema).parse(temp);
            let contentToInsert = parsedDoc.content;
            if (
              parsedDoc.content.childCount === 1 &&
              parsedDoc.content.firstChild?.type.name === "paragraph"
            ) {
              contentToInsert = parsedDoc.content.firstChild.content;
            }

            // Re-add the leading space if it was present
            if (hasLeadingSpace) {
              const spaceNode = schema.text(" ");
              contentToInsert =
                Fragment.from(spaceNode).append(contentToInsert);
            }

            const tr = state.tr.insert(from, contentToInsert);

            view.dispatch(tr);

            return true;
          }

          // Get markdown before cursor for context (limit to last 500 characters for performance)
          const prefixContent = state.doc.content.cut(0, from);
          const prefixDoc = schema.node("doc", null, prefixContent);
          const fullMarkdown = defaultMarkdownSerializer.serialize(prefixDoc);
          const textBefore = fullMarkdown.slice(-800);

          const words = textBefore
            .split(/\s+/)
            .filter((word) => word.length > 0);
          const hasMoreThanOneWord = words.length > 1;

          if (hasMoreThanOneWord) {
            event.preventDefault();

            // Clear any existing timeout
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            // Set loading decoration
            const parentDiv = document.createElement("div");
            parentDiv.style.display = "inline-flex";
            parentDiv.style.alignItems = "center";
            parentDiv.style.justifyContent = "center";
            parentDiv.style.marginLeft = "4px";
            const spinnerContainer = document.createElement("span");
            spinnerContainer.style.display = "inline-block";
            spinnerContainer.style.verticalAlign = "baseline";
            const spinnerSvg = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "svg"
            );
            spinnerSvg.setAttribute("width", "16");
            spinnerSvg.setAttribute("height", "16");
            spinnerSvg.setAttribute("viewBox", "0 0 24 24");
            spinnerSvg.style.opacity = "0.7";
            spinnerSvg.setAttribute("class", "animate-spin");
            const path = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path"
            );
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "currentColor");
            path.setAttribute("stroke-linecap", "round");
            path.setAttribute("stroke-linejoin", "round");
            path.setAttribute("stroke-width", "1.5");
            path.setAttribute(
              "d",
              "M18.001 20A9.96 9.96 0 0 1 12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10c0 .863-.11 1.701-.315 2.5c-.223.867-1.17 1.27-2.015.973c-.718-.253-1.048-1.073-.868-1.813A7 7 0 1 0 15.608 18"
            );
            path.setAttribute("color", "currentColor");
            spinnerSvg.appendChild(path);
            spinnerContainer.appendChild(spinnerSvg);
            parentDiv.appendChild(spinnerContainer);
            decorationSet = DecorationSet.create(view.state.doc, [
              Decoration.widget(from, () => parentDiv),
            ]);
            view.dispatch(view.state.tr);

            // Set a timeout to call the AI autocomplete
            timeoutId = setTimeout(async () => {
              try {
                const endsWithSpace = (str: string) => /\s$/.test(str);

                const currentPos = state.selection.from;
                const currentNode =
                  state.doc.resolve(currentPos).parent.type.name || "paragraph";

                // Extract the last word for incomplete word detection
                const lastWord = textBefore.split(/\s+/).pop() || "";

                // Detect if the last word is likely incomplete
                // Heuristics: short word, no punctuation at end, looks like a fragment
                const isIncompleteWord =
                  !endsWithSpace(textBefore) &&
                  (lastWord.length < 4 || // Very short words might be incomplete
                    /[bcdfghjklmnpqrstvwxyz]{2,}$/i.test(lastWord) || // Ends with multiple consonants
                    (/(ing|ed|er|est|tion|ness|ment|ly)$/.test(lastWord) ===
                      false &&
                      lastWord.length < 8)); // Doesn't have common endings and is short

                // Determine spacing strategy
                // TRUE = space-separated (new word/phrase)
                // FALSE = word completion (no space)
                let needsSpaceSeparation;
                if (endsWithSpace(textBefore)) {
                  // Context ends with space → always new word, no leading space in completion
                  needsSpaceSeparation = false;
                } else {
                  // Context doesn't end with space → check if incomplete word
                  needsSpaceSeparation = !isIncompleteWord;
                }

                const completion = await autoComplete({
                  context: textBefore,
                  node: currentNode,
                  endWithSpace: needsSpaceSeparation,
                  lastWord: lastWord,
                  isIncompleteWord: isIncompleteWord,
                });

                currentSuggestion = completion;

                if (completion) {
                  const html = marked.parse(completion) as string;
                  const temp = document.createElement("div");
                  temp.innerHTML = html;
                  let innerHTML = html;
                  if (temp.firstElementChild?.tagName === "P") {
                    innerHTML = temp.firstElementChild.innerHTML;
                  }
                  const deco = document.createElement("span");
                  deco.className = "editor-autocomplete-placeholder";
                  deco.innerHTML = innerHTML;
                  deco.style.opacity = "0.7";
                  deco.style.color = "#888";

                  decorationSet = DecorationSet.create(view.state.doc, [
                    Decoration.widget(from, () => deco),
                  ]);

                  isAutocompleteActive = true;
                  view.dispatch(view.state.tr);
                }
              } catch (error) {
                console.error("Autocomplete error:", error);
              }
            }, 100); // Small delay to debounce
          }
        }
        return false;
      },
    },
    view(editorView) {
      return {
        update(view, prevState) {
          const state = view.state;
          const { from } = state.selection;

          // Clear decoration if cursor moves (selection changed) and autocomplete is active
          if (isAutocompleteActive && prevState.selection.from !== from) {
            decorationSet = null;
            isAutocompleteActive = false;
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          }

          // Clear decoration if text before cursor doesn't qualify for autocomplete
          const textBefore = state.doc.textBetween(0, from).trim();
          const words = textBefore
            .split(/\s+/)
            .filter((word) => word.length > 0);
          const hasMoreThanOneWord = words.length > 1;

          if (!hasMoreThanOneWord) {
            decorationSet = null;
            isAutocompleteActive = false;
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
          }
        },
      };
    },
  });
}

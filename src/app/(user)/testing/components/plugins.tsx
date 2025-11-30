import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { autoComplete } from "@/lib/model";

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

export function autocompletePlugin() {
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

          // If autocomplete is already active, accept the suggestion
          if (isAutocompleteActive) {
            event.preventDefault();
            decorationSet = null; // Clear decoration first
            isAutocompleteActive = false;
            const tr = state.tr.insertText(currentSuggestion);
            view.dispatch(tr);
            return true;
          }

          // Get text before cursor for context (limit to last 200 characters for performance)
          const fullTextBefore = state.doc.textBetween(0, from).trim();
          const textBefore = fullTextBefore.slice(-200); // Last 200 chars for context
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

            // Set a timeout to call the AI autocomplete
            timeoutId = setTimeout(async () => {
              try {
                console.log(textBefore);

                // const completion = "hey there"
                // Get current node type for context-aware completion
                const currentPos = state.selection.from;
                const currentNode =
                  state.doc.resolve(currentPos).parent.type.name || "paragraph";
                console.log("Current node type:", currentNode);

                const completion = await autoComplete({
                  context: textBefore,
                  node: currentNode,
                });
                currentSuggestion = completion;

                if (completion) {
                  const deco = document.createElement("span");
                  deco.className = "editor-autocomplete-placeholder";
                  deco.textContent = completion;
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

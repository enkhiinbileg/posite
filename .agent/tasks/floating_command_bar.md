---
description: Implement Floating Command Bar
status: pending
---

# Objective
Implement a context-aware Floating Command Bar that follows the user's cursor or appears near selected objects/active tools to improve workflow efficiency.

## Requirements
1.  **Context Awareness**:
    *   **Selection**: When a Text Object is selected, show Text Tools (Font, Size, Color, Delete).
    *   **Drawing**: When Brush/Eraser is active, show Brush Size / Opacity sliders near the cursor.
    *   **Idle**: When idle, maybe show quick tool switcher (Spacebar trigger?).

2.  **Behavior**:
    *   Should not obstruct the view (semi-transparent or auto-hide).
    *   Should be draggable or smartly positioned.

## Implementation Plan
1.  **Component**: Create `FloatingToolbar.tsx`.
2.  **Integration**: Add to `AdvancedEditor.tsx` inside the Main Canvas.
3.  **Positioning**: Use `useMousePosition` or relative positioning to `selectedObject`.
4.  **Styling**: Use `framer-motion` for smooth appearance/disappearance.

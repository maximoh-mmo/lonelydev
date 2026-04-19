---
id: photoboss12
title: "🗑️ Engineering Diary: Building Safe Delete UI for Duplicate Photos"
seoTitle: "Engineering Diary: Building Safe Delete UI for Duplicate Photos"
date: "2026-05-01"
category: "Software Engineering"
summary: "A detailed walkthrough of implementing a multi-layered delete UI for duplicate photos, prioritizing safety through multiple confirmation steps, user selection control, and moving files to system trash rather than permanent deletion."
project: "photoboss"
tags: ["UI Implementation","File Management","Safety Features","Duplicate Detection","User Experience"]
status: "draft"
isAutoTranslated: false
---

## The Problem

With duplicate detection working, users needed a way to act on the results. Simply finding duplicates isn't enough — you need to be able to safely remove the extras without accidentally deleting your only copy.

## The Challenge

Any delete functionality carries enormous risk:
- Accidentally deleting a unique photo would be disastrous
- There's no undo for permanent deletes
- The wrong files could mean losing irreplaceable memories

## The Solution: Safety First

Rather than building a full delete pipeline immediately, I took a layered approach:

### Layer 1: The Button

The "Delete Duplicates" button only appears when:
- The scan has completed (pipeline is in Stopped state)
- Duplicates were actually found (at least one group with >1 image)

This prevents the button from appearing when there's nothing to delete.

### Layer 2: Selection Control

Every thumbnail has a checkbox that lets users mark which copies to keep or delete. The UI defaults to keeping the "best" image (highest quality, largest) and marking others for deletion — but users can override this by toggling the checkbox.

### Layer 3: Confirmation Dialog

When the user clicks "Delete Duplicates", a confirmation dialog appears showing:
- A warning about the action
- Thumbnail previews of all files marked for deletion
- A required "I understand the risks" checkbox
- Disabled "Delete" button until checkbox is checked

### Layer 4: No Duplicates Notification

If a scan completes but no duplicates are found, the user sees an informational dialog: "No duplicates found in the scanned folder."

## Implementation Complete

The UI scaffolding is now fully functional with actual file deletion implemented:

- **Moving files to system trash** - Uses `QFile::moveToTrash()` for safe, recoverable deletion
- **Cache consistency** - After deletion, the UI clears and resets requiring a new scan to repopulate (the prune mechanism will clean stale entries on next scan)
- **User feedback** - Success/error dialogs show results of the deletion operation

## Key Safety Features Preserved

1. **Multiple confirmations** - Button visibility → Dialog confirmation → Risk acknowledgement checkbox
2. **Trash, not permanent delete** - Files go to system trash where they can be recovered
3. **Selection control** - Users can override which files are marked for deletion via checkboxes
4. **Clear feedback** - Success/failure messages indicate what happened

This incremental approach — building the UI shell first, then connecting the action — lets us validate the user experience without rushing the dangerous parts. The delete functionality is now complete and safe to use.
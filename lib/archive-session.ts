import { ARCHIVE_CLOSURE_DATE, type DeckArchive } from "./archive.ts";

export type ArchiveSessionState = {
  ownerId: string | null;
  archiveOwnerId: string | null;
  generation: number;
  archive: DeckArchive;
  loading: boolean;
  error: string;
};

export type ArchiveSessionAction =
  | { type: "owner-changed"; ownerId: string | null }
  | { type: "load-started"; ownerId: string; generation: number }
  | { type: "load-succeeded"; ownerId: string; generation: number; archive: DeckArchive }
  | { type: "load-failed"; ownerId: string; generation: number; message: string };

function emptyArchive(): DeckArchive {
  return { generatedAt: "", closureDate: ARCHIVE_CLOSURE_DATE, soloDecks: [], unionDecks: [] };
}

export function createArchiveSessionState(): ArchiveSessionState {
  return {
    ownerId: null,
    archiveOwnerId: null,
    generation: 0,
    archive: emptyArchive(),
    loading: false,
    error: "",
  };
}

function actionMatchesOwner(
  state: ArchiveSessionState,
  action: { ownerId: string; generation: number },
) {
  return state.ownerId === action.ownerId && state.generation === action.generation;
}

export function archiveSessionReducer(
  state: ArchiveSessionState,
  action: ArchiveSessionAction,
): ArchiveSessionState {
  if (action.type === "owner-changed") {
    if (state.ownerId === action.ownerId) return state;
    return {
      ownerId: action.ownerId,
      archiveOwnerId: null,
      generation: state.generation + 1,
      archive: emptyArchive(),
      loading: false,
      error: "",
    };
  }
  if (!actionMatchesOwner(state, action)) return state;
  if (action.type === "load-started") return { ...state, loading: true, error: "" };
  if (action.type === "load-failed") return { ...state, loading: false, error: action.message };
  return {
    ...state,
    archiveOwnerId: action.ownerId,
    archive: action.archive,
    loading: false,
    error: "",
  };
}

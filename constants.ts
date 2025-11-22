import { DocType } from './types';

export const DOC_TYPES_CONFIG = [
  {
    type: DocType.MAIN,
    description: "Upload Mrunal's Handouts or your Main Notes. We will extract chapters from here.",
    required: true,
    icon: "📚"
  },
  {
    type: DocType.PYQ,
    description: "Upload PYQ PDFs. If no PYQs match a topic, we'll skip the UPSC Angle section.",
    required: false,
    icon: "⚖️"
  },
  {
    type: DocType.NCERT,
    description: "Upload NCERTs. Optional foundation check.",
    required: false,
    icon: "🏫"
  },
  {
    type: DocType.CURRENT,
    description: "Upload CA Monthly PDFs. We'll just extract headlines.",
    required: false,
    icon: "🌍"
  }
];

export const MOCK_LOADING_MSGS = [
  "Scanning Main Notes for Chapters...",
  "Identifying high-yield linkages...",
  "Checking for relevant PYQs...",
  "Filtering UPSC traps...",
  "Synthesizing reading strategy..."
];
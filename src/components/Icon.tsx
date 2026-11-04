import {
  Bookmark, Box, CodeXml, Sheet, CalendarDays, Calendar1, ChartNoAxesGantt, Table2, CircleAlert, CircleHelp, Code, Columns2, Columns3, Columns4, Frame, Heading, Image, ImagePlus,
  KeyRound, LayoutGrid, LayoutPanelTop, Lightbulb, Link, List, ListChecks, ListOrdered, MessageSquareText,
  Minus, MousePointerClick, MoveVertical, PenLine, Pilcrow, Pin, Quote, RectangleVertical, Rows3, StickyNote,
  Target, TriangleAlert, Type, Video, type LucideIcon,
} from 'lucide-react';
import type { IconName } from '../modules/types';

const MAP: Record<IconName, LucideIcon> = {
  box: Box, section: LayoutPanelTop, row: Rows3, columns2: Columns2, columns3: Columns3, columns4: Columns4,
  grid: LayoutGrid, spacer: MoveVertical, divider: Minus, heading: Heading, text: Pilcrow, richtext: Type,
  quote: Quote, callout: MessageSquareText, list: List, listOrdered: ListOrdered, checklist: ListChecks, code: Code,
  image: Image, imageCaption: ImagePlus, video: Video, figure: Frame, button: MousePointerClick, target: Target,
  key: KeyRound, note: StickyNote, important: CircleAlert, warning: TriangleAlert, example: Lightbulb,
  exercise: PenLine, question: CircleHelp, summary: Pin, links: Link, column: RectangleVertical, template: Bookmark,
  calendar: CalendarDays, calendarMini: Calendar1, curriculum: Table2, progress: ChartNoAxesGantt,
  table: Sheet, html: CodeXml,
};

export function ModuleIcon({ name, size = 16 }: { name: IconName; size?: number }) {
  const C = MAP[name] ?? Box;
  return <C size={size} strokeWidth={1.75} aria-hidden="true" />;
}

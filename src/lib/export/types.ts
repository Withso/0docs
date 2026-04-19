export interface ExportPage {
  id: string;
  title: string;
  slug: string;
  order_index: number;
  meta_description?: string | null;
  nav_group_id?: string | null;
  nav_title?: string | null;
}

export interface ExportSection {
  id: string;
  page_id: string;
  title: string;
  order_index: number;
  nav_title?: string | null;
}

export interface ExportBlock {
  id: string;
  section_id: string;
  type: string;
  content: any;
  order_index: number;
}

export interface ExportNavGroup {
  id: string;
  title: string;
  order_index: number;
  type?: string;
  tab_id?: string | null;
  metadata?: Record<string, any>;
}

export interface ExportTab {
  id: string;
  label: string;
  icon?: string | null;
  order_index: number;
}

export interface ExportResult {
  files: { path: string; content: string }[];
}

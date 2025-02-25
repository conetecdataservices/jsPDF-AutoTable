// Generated by dts-bundle-generator v9.5.1

export type jsPDFConstructor = any;
export type jsPDFDocument = any;
export type Opts = {
	[key: string]: string | number;
};
declare class DocHandler {
	private readonly jsPDFDocument;
	readonly userStyles: Partial<Styles>;
	constructor(jsPDFDocument: jsPDFDocument);
	static setDefaults(defaults: UserOptions, doc?: jsPDFDocument | null): void;
	private static unifyColor;
	applyStyles(styles: Partial<Styles>, fontOnly?: boolean): void;
	splitTextToSize(text: string | string[], size: number, opts: Opts): string[];
	/**
	 * Adds a rectangle to the PDF
	 * @param x Coordinate (in units declared at inception of PDF document) against left edge of the page
	 * @param y Coordinate (in units declared at inception of PDF document) against upper edge of the page
	 * @param width Width (in units declared at inception of PDF document)
	 * @param height Height (in units declared at inception of PDF document)
	 * @param fillStyle A string specifying the painting style or null. Valid styles include: 'S' [default] - stroke, 'F' - fill, and 'DF' (or 'FD') - fill then stroke.
	 */
	rect(x: number, y: number, width: number, height: number, fillStyle: "S" | "F" | "DF" | "FD"): any;
	getLastAutoTable(): Table | null;
	getTextWidth(text: string | string[]): number;
	getDocument(): any;
	setPage(page: number): void;
	addPage(): any;
	getFontList(): {
		[key: string]: string[] | undefined;
	};
	getGlobalOptions(): UserOptions;
	getDocumentOptions(): UserOptions;
	pageSize(): {
		width: number;
		height: number;
	};
	scaleFactor(): number;
	getLineHeightFactor(): number;
	getLineHeight(fontSize: number): number;
	pageNumber(): number;
}
export type MarginPadding = {
	top: number;
	right: number;
	bottom: number;
	left: number;
};
declare class HookData {
	table: Table;
	pageNumber: number;
	settings: Settings;
	doc: jsPDFDocument;
	cursor: Pos | null;
	constructor(doc: DocHandler, table: Table, cursor: Pos | null);
}
export declare class CellHookData extends HookData {
	cell: Cell;
	row: Row;
	column: Column;
	section: "head" | "body" | "foot";
	constructor(doc: DocHandler, table: Table, cell: Cell, row: Row, column: Column, cursor: Pos | null);
}
export interface ContentInput {
	body: RowInput[];
	head: RowInput[];
	foot: RowInput[];
	columns: ColumnInput[];
}
export interface TableInput {
	id: string | number | undefined;
	settings: Settings;
	styles: StylesProps;
	hooks: HookProps;
	content: ContentInput;
}
export type Pos = {
	x: number;
	y: number;
};
export type PageHook = (data: HookData) => void | boolean;
export type CellHook = (data: CellHookData) => void | boolean;
export interface HookProps {
	didParseCell: CellHook[];
	willDrawCell: CellHook[];
	didDrawCell: CellHook[];
	willDrawPage: PageHook[];
	didDrawPage: PageHook[];
}
export interface Settings {
	includeHiddenHtml: boolean;
	useCss: boolean;
	theme: "striped" | "grid" | "plain";
	startY: number;
	margin: MarginPadding;
	pageBreak: "auto" | "avoid" | "always";
	rowPageBreak: "auto" | "avoid";
	tableWidth: "auto" | "wrap" | number;
	showHead: "everyPage" | "firstPage" | "never";
	showFoot: "everyPage" | "lastPage" | "never";
	tableLineWidth: number;
	tableLineColor: Color;
	horizontalPageBreak?: boolean;
	horizontalPageBreakBehaviour?: "immediately" | "afterAllRows";
	horizontalPageBreakRepeat?: string | number | string[] | number[] | null;
}
export interface StylesProps {
	styles: Partial<Styles>;
	headStyles: Partial<Styles>;
	bodyStyles: Partial<Styles>;
	footStyles: Partial<Styles>;
	alternateRowStyles: Partial<Styles>;
	columnStyles: {
		[key: string]: Partial<Styles>;
	};
}
export type ContentSettings = {
	body: Row[];
	head: Row[];
	foot: Row[];
	columns: Column[];
};
export declare class Table {
	readonly id?: string | number;
	readonly settings: Settings;
	readonly styles: StylesProps;
	readonly hooks: HookProps;
	readonly columns: Column[];
	readonly head: Row[];
	readonly body: Row[];
	readonly foot: Row[];
	pageNumber: number;
	finalY?: number;
	startPageNumber?: number;
	constructor(input: TableInput, content: ContentSettings);
	getHeadHeight(columns: Column[]): number;
	getFootHeight(columns: Column[]): number;
	allRows(): Row[];
	callCellHooks(doc: DocHandler, handlers: CellHook[], cell: Cell, row: Row, column: Column, cursor: {
		x: number;
		y: number;
	} | null): boolean;
	callEndPageHooks(doc: DocHandler, cursor: {
		x: number;
		y: number;
	}): void;
	callWillDrawPageHooks(doc: DocHandler, cursor: {
		x: number;
		y: number;
	}): void;
	getWidth(pageWidth: number): number;
}
export declare class Row {
	readonly raw: HTMLTableRowElement | RowInput;
	readonly element?: HTMLTableRowElement;
	readonly index: number;
	readonly section: Section;
	readonly cells: {
		[key: string]: Cell;
	};
	spansMultiplePages: boolean;
	height: number;
	constructor(raw: RowInput | HTMLTableRowElement, index: number, section: Section, cells: {
		[key: string]: Cell;
	}, spansMultiplePages?: boolean);
	getMaxCellHeight(columns: Column[]): number;
	hasRowSpan(columns: Column[]): boolean;
	canEntireRowFit(height: number, columns: Column[]): boolean;
	getMinimumRowHeight(columns: Column[], doc: DocHandler): number;
}
export type Section = "head" | "body" | "foot";
export declare class Cell {
	raw: HTMLTableCellElement | CellInput;
	styles: Styles;
	text: string[];
	section: Section;
	colSpan: number;
	rowSpan: number;
	contentHeight: number;
	contentWidth: number;
	wrappedWidth: number;
	minReadableWidth: number;
	minWidth: number;
	width: number;
	height: number;
	x: number;
	y: number;
	constructor(raw: CellInput, styles: Styles, section: Section);
	getTextPos(): Pos;
	getContentHeight(scaleFactor: number, lineHeightFactor?: number): number;
	padding(name: "vertical" | "horizontal" | "top" | "bottom" | "left" | "right"): number;
}
export declare class Column {
	raw: ColumnInput | null;
	dataKey: string | number;
	index: number;
	wrappedWidth: number;
	minReadableWidth: number;
	minWidth: number;
	width: number;
	constructor(dataKey: string | number, raw: ColumnInput | null, index: number);
	getMaxCustomCellWidth(table: Table): number;
}
export interface LineWidths {
	bottom: number;
	top: number;
	left: number;
	right: number;
}
export type FontStyle = "normal" | "bold" | "italic" | "bolditalic";
export type StandardFontType = "helvetica" | "times" | "courier";
export type CustomFontType = string;
export type FontType = StandardFontType | CustomFontType;
export type HAlignType = "left" | "center" | "right" | "justify";
export type VAlignType = "top" | "middle" | "bottom";
export type OverflowType = "linebreak" | "ellipsize" | "visible" | "hidden" | ((text: string | string[], width: number) => string | string[]);
export type CellWidthType = "auto" | "wrap" | number;
export interface Styles {
	font: FontType;
	fontStyle: FontStyle;
	overflow: OverflowType;
	fillColor: Color;
	textColor: Color;
	halign: HAlignType;
	valign: VAlignType;
	fontSize: number;
	cellPadding: MarginPaddingInput;
	lineColor: Color;
	lineWidth: number | Partial<LineWidths>;
	cellWidth: CellWidthType;
	minCellHeight: number;
	minCellWidth: number;
}
export type ThemeType = "striped" | "grid" | "plain" | null;
export type PageBreakType = "auto" | "avoid" | "always";
export type RowPageBreakType = "auto" | "avoid";
export type TableWidthType = "auto" | "wrap" | number;
export type ShowHeadType = "everyPage" | "firstPage" | "never" | boolean;
export type ShowFootType = "everyPage" | "lastPage" | "never" | boolean;
export type HorizontalPageBreakBehaviourType = "immediately" | "afterAllRows";
export interface UserOptions {
	includeHiddenHtml?: boolean;
	useCss?: boolean;
	theme?: ThemeType;
	startY?: number | false;
	margin?: MarginPaddingInput;
	pageBreak?: PageBreakType;
	rowPageBreak?: RowPageBreakType;
	tableWidth?: TableWidthType;
	showHead?: ShowHeadType;
	showFoot?: ShowFootType;
	tableLineWidth?: number;
	tableLineColor?: Color;
	tableId?: string | number;
	head?: RowInput[];
	body?: RowInput[];
	foot?: RowInput[];
	html?: string | HTMLTableElement;
	columns?: ColumnInput[];
	horizontalPageBreak?: boolean;
	horizontalPageBreakRepeat?: string[] | number[] | string | number;
	horizontalPageBreakBehaviour?: HorizontalPageBreakBehaviourType;
	styles?: Partial<Styles>;
	bodyStyles?: Partial<Styles>;
	headStyles?: Partial<Styles>;
	footStyles?: Partial<Styles>;
	alternateRowStyles?: Partial<Styles>;
	columnStyles?: {
		[key: string]: Partial<Styles>;
	};
	/** Called when the plugin finished parsing cell content. Can be used to override content or styles for a specific cell. */
	didParseCell?: CellHook;
	/** Called before a cell or row is drawn. Can be used to call native jspdf styling functions such as `doc.setTextColor` or change position of text etc before it is drawn. */
	willDrawCell?: CellHook;
	/** Called after a cell has been added to the page. Can be used to draw additional cell content such as images with `doc.addImage`, additional text with `doc.addText` or other jspdf shapes. */
	didDrawCell?: CellHook;
	/** Called before starting to draw on a page. Can be used to add headers or any other content that you want on each page there is an autotable. */
	willDrawPage?: PageHook;
	/** Called after the plugin has finished drawing everything on a page. Can be used to add footers with page numbers or any other content that you want on each page there is an autotable. */
	didDrawPage?: PageHook;
}
export type ColumnInput = string | number | {
	header?: CellInput;
	footer?: CellInput;
	dataKey?: string | number;
};
export type Color = [
	number,
	number,
	number
] | number | string | false;
export type MarginPaddingInput = number | number[] | {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
	horizontal?: number;
	vertical?: number;
};
export interface CellDef {
	rowSpan?: number;
	colSpan?: number;
	styles?: Partial<Styles>;
	content?: string | string[] | number;
	_element?: HTMLTableCellElement;
}
declare class HtmlRowInput extends Array<CellDef> {
	_element: HTMLTableRowElement;
	constructor(element: HTMLTableRowElement);
}
export type CellInput = null | string | string[] | number | boolean | CellDef;
export type RowInput = {
	[key: string]: CellInput;
} | HtmlRowInput | CellInput[];
export type autoTableInstanceType = (options: UserOptions) => void;
export declare function applyPlugin(jsPDF: jsPDFConstructor): void;
export declare function autoTable(d: jsPDFDocument, options: UserOptions): void;
export declare function __createTable(d: jsPDFDocument, options: UserOptions): Table;
export declare function __drawTable(d: jsPDFDocument, table: Table): void;

export {
	autoTable as default,
};

export {};

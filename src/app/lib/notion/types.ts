// Callout block type (normal or with children)
export type Callout =
  | (Block & {
      type: 'callout';
      callout: {
        rich_text: RichText[];
        icon: {
          type: 'emoji';
          emoji: string;
        } | {
          type: 'external';
          external: {
            url: string;
          };
        } | null;
        color: string;
      };
      has_children?: false;
    })
  | (Block & {
      type: 'callout';
      callout: {
        rich_text: RichText[];
        icon: {
          type: 'emoji';
          emoji: string;
        } | {
          type: 'external';
          external: {
            url: string;
          };
        } | null;
        color: string;
      };
      has_children: true;
    });

// PDF block type (discriminated union like Mention)
export type PDF =
  | (Block & {
      type: 'pdf';
      pdf: {
        type: 'file';
        file: NotionFile;
        caption: RichText[];
      };
    })
  | (Block & {
      type: 'pdf';
      pdf: {
        type: 'external';
        external: NotionExternal;
        caption: RichText[];
      };
    });


// Video block type
export type Video =
  | (Block & {
      type: 'video';
      video: {
        type: 'file';
        file: NotionFile;
        caption?: RichText[];
      };
    })
  | (Block & {
      type: 'video';
      video: {
        type: 'external';
        external: NotionExternal;
        caption?: RichText[];
      };
    });

export type Audio =
  | (Block & {
      type: 'audio';
      audio: {
        type: 'file';
        file: NotionFile;
        caption?: RichText[];
      };
    })
  | (Block & {
      type: 'audio';
      audio: {
        type: 'external';
        external: NotionExternal;
        caption?: RichText[];
      };
    });


// Synced block type
export type SyncedBlock =
  | (Block & {
      type: 'synced_block';
      synced_block: {
        synced_from: null;
      };
    })
  | (Block & {
      type: 'synced_block';
      synced_block: {
        synced_from: {
          type: 'block_id';
          block_id: string;
        };
      };
    });


// Embed block type
export type Embed = Block & {
    type: 'embed';
    embed: {
        url: string;
        caption?: RichText[];
    };
};
// Bookmark block type
export type Bookmark = Block & {
    type: 'bookmark';
    bookmark: {
        url: string;
        caption?: RichText[];
    };
};

export type LinkPreview = Block & {
    type: 'link_preview',
    link_preview: {
      url: string
    }
}

// Tipus Mention segons l'estructura real de la Notion API
export type Mention =
    | {
        type: 'page';
        page: {
            id: string;
        };
        // Altres tipus de mention no es gestionen ara
    }
    | {
        type: 'link_mention';
        link_mention: {
            href: string;
            title: string;
            icon_url: string;
            description: string;
            link_author: string;
            link_provider: string;
            thumbnail_url: string;
        };
    }
    | {
        type: 'date',
        date: {
            start: string,
            end: string,
            time_zone: null
        }
    };

// Tipus Chunk segons l'estructura real de la Notion API
export type Chunk =
    | {
        type: 'text';
        text: {
            content: string;
            link: null | { url: string };
        };
        annotations: {
            bold: boolean;
            italic: boolean;
            underline: boolean;
            strikethrough?: boolean;
            code?: boolean;
            color?: string;
        };
        plain_text: string;
        href: string | null;
    }
    | {
        type: 'equation';
        equation: {
            expression: string;
        };
        annotations: {
            bold: boolean;
            italic: boolean;
            underline: boolean;
            strikethrough?: boolean;
            code?: boolean;
            color?: string;
        };
        plain_text: string;
        href: string | null;
    }
    | {
        type: 'mention';
        mention: Mention;
        annotations: {
            bold: boolean;
            italic: boolean;
            underline: boolean;
            strikethrough?: boolean;
            code?: boolean;
            color?: string;
        };
        plain_text: string;
        href: string | null;
    };

// Tipus RichText segons l'estructura real de la Notion API
export type RichText = Chunk;

// Chunk

export type NotionFile = {
    url: string;
    expiry_time?: string;
};

export type NotionExternal = {
    url: string;
};

export type ImageBlock = Block & {
    type: 'image';
    image: {
        type: 'file' | 'external';
        file?: NotionFile;
        external?: NotionExternal;
        caption: RichText[];
    };
};

export type EquationBlock = {
    type: 'equation';
    equation: {
        expression: string;
    };
};

export type Block = {
    id: string;
    type: string;
    archived?: boolean;
    in_trash?: boolean;
    has_children?: boolean;
    [key: string]: unknown;
};

// Table block type
export type Table = Block & {
    type: 'table';
    table: {
        table_width: number;
        has_column_header: boolean;
        has_row_header: boolean;
    };
};

// Table row block type
export type TableRow = Block & {
    type: 'table_row';
    table_row: {
        cells: Cell[][];
    };
};

// Cell type: array of RichText (each cell is an array of RichText objects)
export type Cell = RichText;

// Column list block type
export type ColumnList = Block & {
    type: 'column_list';
    column_list: Record<string, never>; // Empty object
};

// Column block type
export type Column = Block & {
    type: 'column';
    column: {
        width_ratio: number;
    };
};

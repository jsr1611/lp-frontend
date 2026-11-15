// word.model.ts

export interface Word {
    _id: string; 
    arabic: string;
    pronunciation: string,
    uzbek: string;
    english?: string;
    category: Category,
    remark?: string,
    example?: { arabic?: string; uzbek?: string; english?: string },
    __v?: number; // Optional property, usually representing the version key in MongoDB
  }  

export enum Category {
    Verb = 'verb',
    Noun = 'noun', 
    Adjective = 'adjective', 
    Preposition = "preposition",
    Conjunction = "conjunction",
    Adverb = 'adverb', 
    Number = 'number', 
    Other = 'other'
};
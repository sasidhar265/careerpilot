declare module '@legacy/server/providers.js' {export function runProvider(action:string,body:Record<string,unknown>):Promise<Record<string,unknown>>;}
declare module '@legacy/server/employer-feeds.js' {
 export interface EmployerBoard {provider:string;board:string;company:string;region:string;careersUrl:string}
 export interface SourceJob {id:string;title:string;company:string;location:string;description:string;url:string;source:string;contract?:string;workplace?:string;salaryMin?:number|null;salaryMax?:number|null;salaryEstimated?:boolean;created?:string;closingDate?:string;excerpt?:boolean}
 export function employerBoards(value?:string):EmployerBoard[];
 export function fetchEmployerBoard(board:EmployerBoard,options?:{deadline?:number}):Promise<SourceJob[]>;
}
declare module '@legacy/src/resume-export.js' {export function createDocx(text:string):Promise<Blob>;export function createPdf(text:string):{output(format:'arraybuffer'):ArrayBuffer};}

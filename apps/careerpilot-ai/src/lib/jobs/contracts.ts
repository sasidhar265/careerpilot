export const providerIds=['greenhouse','lever','ashby','smartrecruiters'] as const;
export type ProviderId=typeof providerIds[number];
export type Board={provider:ProviderId;board:string;company:string;region:'global'|'eu';careersUrl?:string};
export type GeoPoint={label:string;latitude:number;longitude:number;provenance:string};
export type Listing={externalId:string;title:string;company:string;location:string;description:string;url:string;applicationUrl:string|null;source:string;publishedAt:string|null;closingAt:string|null;contract:string;employmentType:string|null;workplace:string;salaryMin:number|null;salaryMax:number|null;requirements:string;benefits:string;skills:string[];department:string|null;industry:string|null;seniority:string|null;experienceMinYears:number|null;experienceMaxYears:number|null;experienceEvidence:string|null;visaSponsorship:boolean|null;visaEvidence:string|null;locations:GeoPoint[];excerpt:boolean};
export type SourceBatch={jobs:Listing[];observedIds?:string[];complete:boolean;note:string|null};
export interface JobSourceProvider {id:ProviderId;fetch(board:Board,options:{deadline:number;signal?:AbortSignal}):Promise<SourceBatch>}
export type SourceErrorCode='UNAVAILABLE'|'NOT_FOUND'|'RATE_LIMITED'|'ACCESS_DENIED'|'INVALID_RESPONSE'|'TIMEOUT'|'INVALID_CONFIGURATION';
export class SourceError extends Error{code:SourceErrorCode;retryAfterSeconds:number;constructor(code:SourceErrorCode,retryAfterSeconds=0){super(code);this.code=code;this.retryAfterSeconds=retryAfterSeconds;}}

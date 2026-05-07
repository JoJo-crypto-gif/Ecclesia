import { Member } from '../types';

type MemberNameSource = Pick<Member, 'firstName' | 'otherName' | 'lastName' | 'titles'>;

const cleanText = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

export const getMemberTitles = (member?: Pick<Member, 'titles'> | null) =>
  (Array.isArray(member?.titles) ? member.titles : [])
    .map((title) => cleanText(title))
    .filter(Boolean)
    .join(' ');

export const getMemberDisplayName = (
  member?: MemberNameSource | null,
  { includeTitles = true, includeOtherName = true } = {}
) => {
  if (!member) return '';

  const baseName = [
    cleanText(member.firstName),
    includeOtherName ? cleanText(member.otherName) : '',
    cleanText(member.lastName),
  ]
    .filter(Boolean)
    .join(' ');

  const titleLine = includeTitles ? getMemberTitles(member) : '';
  return [titleLine, baseName].filter(Boolean).join(' ');
};

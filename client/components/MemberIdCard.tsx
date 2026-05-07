import React from "react";
import { Member } from "../types";
import { QrCode, Phone, Mail } from "lucide-react";
import { getMemberTitles } from "../utils/memberName";

interface MemberIdCardProps {
  member: Member;
  churchName?: string;
  zoneName?: string;
}

export const MemberIdCard: React.FC<MemberIdCardProps> = ({
  member,
  churchName = "Ecclesia Church",
  zoneName,
}) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(member.id)}`;
  const titleLine = getMemberTitles(member);

  const CardBase = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`w-[350px] h-[220px] bg-white rounded-xl overflow-hidden shadow-sm relative border border-slate-200 flex flex-col font-sans select-none print:shadow-none print:border-slate-800 ${className}`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern
            id="pattern-circles"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="1"
              className="text-indigo-600"
              fill="currentColor"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#pattern-circles)" />
        </svg>
      </div>
      {children}
    </div>
  );

  return (
    <div
      id="printable-id-card"
      className="flex flex-col md:flex-row gap-8 items-start justify-center p-4"
    >
      {/* FRONT OF CARD */}
      <CardBase>
        {/* Header */}
        <div className="h-16 bg-gradient-to-r from-indigo-700 to-indigo-600 flex items-center px-5 justify-between relative z-10">
          <div className="flex flex-col">
            <div className="text-white font-bold text-lg leading-tight tracking-tight">
              {churchName}
            </div>
            <div className="text-indigo-200 text-[10px] uppercase tracking-wider font-semibold">
              Membership Card
            </div>
          </div>
          <div className="w-9 h-9 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex gap-5 items-center relative z-10">
          {/* Photo */}
          <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-md flex-shrink-0 relative">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-0.5">
            {titleLine && (
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-600">
                {titleLine}
              </div>
            )}
            <h3 className="font-extrabold text-slate-900 text-xl leading-tight line-clamp-1">
              {member.firstName}
            </h3>
            <h3 className="font-semibold text-slate-900 text-lg leading-tight line-clamp-1">
              {member.lastName}
            </h3>
            <div className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide mt-1 border border-indigo-100">
              {member.role || "Member"}
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3">
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-semibold">
                  ID Number
                </div>
                <div className="text-xs font-mono text-slate-700 font-bold">
                  {member.id.substring(0, 8).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-semibold">
                  Zone
                </div>
                <div className="text-xs text-slate-700 font-bold truncate">
                  {zoneName || "General"}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Footer Strip */}
        <div className="h-1.5 bg-indigo-600 w-full absolute bottom-0"></div>
      </CardBase>

      {/* BACK OF CARD */}
      <CardBase>
        <div className="h-full flex flex-col items-center justify-center relative p-6 text-center z-10">
          <div className="mb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Scan for Attendance
            </h4>
          </div>

          <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm mb-4">
            <img
              src={qrUrl}
              className="w-24 h-24 object-contain mix-blend-multiply"
              alt="QR Code"
            />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-medium max-w-[200px] leading-tight mx-auto">
              If found, please return to {churchName}.
            </p>
            {member.emergencyPhone && (
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-600 pt-1">
                <Phone size={10} /> ICE: {member.emergencyPhone}
              </div>
            )}
          </div>

          {/* Footer Strip */}
          <div className="h-1.5 bg-slate-200 w-full absolute bottom-0"></div>
        </div>
      </CardBase>
    </div>
  );
};

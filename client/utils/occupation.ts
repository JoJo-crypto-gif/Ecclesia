export interface EmploymentDetails {
  status: 'Employed' | 'Unemployed' | 'Student' | 'Retired' | 'Self-Employed';
  role?: string;        // "what do you do" (job/major)
  organization?: string;// "where do you work" (workplace/school)
  location?: string;    // "where is the school located" (location)
}

/**
 * Safely parses the member's raw occupation field.
 * Handles both the new JSON structure and legacy plain-text fields.
 */
export const parseOccupation = (raw?: string | null): EmploymentDetails => {
  if (!raw || !raw.trim()) {
    return { status: 'Unemployed' };
  }

  const trimmed = raw.trim();

  // If the raw field is a JSON string, try to parse it
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const status = parsed.status || 'Employed';
        return {
          status: status === 'Employed' || status === 'Unemployed' || status === 'Student' || status === 'Retired' || status === 'Self-Employed' ? status : 'Employed',
          role: parsed.role || '',
          organization: parsed.organization || '',
          location: parsed.location || '',
        };
      }
    } catch (e) {
      // Graceful fallback if JSON parsing fails
    }
  }

  // Graceful legacy fallback: treat plain text as Employed status with role = raw value
  return {
    status: 'Employed',
    role: trimmed,
    organization: '',
    location: '',
  };
};

/**
 * Serializes the EmploymentDetails into a compact JSON string.
 */
export const serializeOccupation = (details: EmploymentDetails): string => {
  return JSON.stringify({
    status: details.status,
    role: details.role?.trim() || '',
    organization: details.organization?.trim() || '',
    location: details.location?.trim() || '',
  });
};

/**
 * Formats raw occupation string into a human-friendly readable display string.
 */
export const formatOccupation = (raw?: string | null): string => {
  if (!raw || !raw.trim()) return 'Not specified';
  
  const details = parseOccupation(raw);

  if (details.status === 'Employed') {
    if (details.role && details.organization) {
      return `${details.role} at ${details.organization}`;
    }
    if (details.role) {
      return details.role;
    }
    if (details.organization) {
      return `Employed at ${details.organization}`;
    }
    return 'Employed';
  }

  if (details.status === 'Self-Employed') {
    if (details.role && details.organization) {
      return `${details.role} at ${details.organization}`;
    }
    if (details.role) {
      return details.role;
    }
    if (details.organization) {
      return `Self-Employed at ${details.organization}`;
    }
    return 'Self-Employed';
  }

  if (details.status === 'Student') {
    const rolePart = details.role ? `${details.role} ` : '';
    const label = `${rolePart}Student`;
    
    if (details.organization && details.location) {
      return `${label} at ${details.organization} (${details.location})`;
    }
    if (details.organization) {
      return `${label} at ${details.organization}`;
    }
    return label;
  }

  if (details.status === 'Retired') {
    return 'Retired / Pensioner';
  }

  if (details.status === 'Unemployed') {
    return 'Unemployed';
  }

  return raw;
};

import {
  getDistrictsByState,
  getPincodeDetails,
  getStates
} from "indian-pincodes";

const STATE_NAME_ALIASES = {
  "Andaman and Nicobar Islands": "Andaman & Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu": "Dadra and Nagar Haveli",
  "Jammu and Kashmir": "Jammu & Kashmir"
};

export const INDIA_STATES = getStates()
  .sort((firstState, secondState) => firstState.localeCompare(secondState));

export function getDistrictOptions(stateName) {
  if (!stateName) {
    return [];
  }

  const directDistricts = getDistrictsByState(stateName);

  if (directDistricts.length > 0) {
    return directDistricts.sort((firstDistrict, secondDistrict) =>
      firstDistrict.localeCompare(secondDistrict)
    );
  }

  const aliasDistricts = getDistrictsByState(STATE_NAME_ALIASES[stateName] || "");

  return aliasDistricts.sort((firstDistrict, secondDistrict) =>
    firstDistrict.localeCompare(secondDistrict)
  );
}

export function lookupIndianPin(pinCode) {
  if (!/^\d{6}$/.test(pinCode)) {
    return null;
  }

  const details = getPincodeDetails(Number(pinCode));

  if (!details) {
    return null;
  }

  return {
    city: details.name.trim(),
    district: details.district,
    state: details.state
  };
}

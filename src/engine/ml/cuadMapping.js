// Mapping from the 41 CUAD categories (Hendrycks et al., 2021) to the Fineprint clause taxonomy.
// null = metadata categories that Fineprint handles through extraction, not classification.
// 'General' = legal concepts outside the Fineprint risk taxonomy (kept as a negative class).
export const CUAD_TO_FINEPRINT = {
  'Governing Law': 'Governing Law',
  'Cap On Liability': 'Liability',
  'Uncapped Liability': 'Liability',
  'Liquidated Damages': 'Liability',
  'Termination For Convenience': 'Termination',
  'Post-Termination Services': 'Termination',
  'Renewal Term': 'Term & Renewal',
  'Notice Period To Terminate Renewal': 'Term & Renewal',
  'Expiration Date': 'Term & Renewal',
  'Non-Compete': 'Non-Compete',
  'Exclusivity': 'Non-Compete',
  'No-Solicit Of Customers': 'Non-Compete',
  'No-Solicit Of Employees': 'Non-Compete',
  'Competitive Restriction Exception': 'Non-Compete',
  'Anti-Assignment': 'Assignment',
  'Change Of Control': 'Assignment',
  'Ip Ownership Assignment': 'IP Ownership',
  'Joint Ip Ownership': 'IP Ownership',
  'License Grant': 'IP Ownership',
  'Non-Transferable License': 'IP Ownership',
  'Irrevocable Or Perpetual License': 'IP Ownership',
  'Affiliate License-Licensee': 'IP Ownership',
  'Affiliate License-Licensor': 'IP Ownership',
  'Unlimited/All-You-Can-Eat-License': 'IP Ownership',
  'Source Code Escrow': 'IP Ownership',
  'Warranty Duration': 'Warranties',
  'Revenue/Profit Sharing': 'Payment Terms',
  'Minimum Commitment': 'Payment Terms',
  'Most Favored Nation': 'Payment Terms',
  'Volume Restriction': 'Payment Terms',
  'Price Restrictions': 'Payment Terms',
  'Audit Rights': 'General',
  'Insurance': 'General',
  'Covenant Not To Sue': 'General',
  'Third Party Beneficiary': 'General',
  'Non-Disparagement': 'General',
  'Rofr/Rofo/Rofn': 'General',
  'Document Name': null,
  'Parties': null,
  'Agreement Date': null,
  'Effective Date': null,
};

// Label space used when scoring classification against CUAD.
export const EVAL_LABELS = ['Governing Law', 'Liability', 'Termination', 'Term & Renewal', 'Non-Compete', 'Assignment', 'IP Ownership', 'Warranties', 'Payment Terms', 'General'];

// Fineprint predictions outside the CUAD label space are projected to General before scoring.
export const projectToEval = cat => (EVAL_LABELS.includes(cat) ? cat : 'General');

// CUAD categories that correspond directly to a Fineprint risk signal (sentence-level detection).
export const SIGNAL_TO_CUAD = {
  uncapped_liability: 'Uncapped Liability',
  liability_cap: 'Cap On Liability',
  termination_convenience: 'Termination For Convenience',
  auto_renewal: 'Renewal Term',
  non_compete: 'Non-Compete',
  exclusivity: 'Exclusivity',
  perpetual_licence: 'Irrevocable Or Perpetual License',
  ip_assignment: 'Ip Ownership Assignment',
  anti_assignment: 'Anti-Assignment',
  change_of_control: 'Change Of Control',
};

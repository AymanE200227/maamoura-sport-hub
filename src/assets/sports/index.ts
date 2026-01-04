// Sport images index - Ball-only & Equipment images (no humans)
import footballImg from './football.jpg';
import basketballImg from './basketball_new.jpg';
import volleyballImg from './volleyball_new.jpg';
import handballImg from './handball_new.jpg';
import tennisImg from './tennis.jpg';
import rugbyImg from './rugby.jpg';
import combatImg from './combat_new.jpg';
import enduranceImg from './endurance_new.jpg';
import nutritionImg from './nutrition_new.jpg';
import sportifImg from './sportif_new.jpg';
import natationImg from './natation.jpg';

// Military images (weapons & equipment - no humans)
import militaireImg from './militaire_new.jpg';
import ak47Img from './ak47.jpg';
import m16Img from './m16.jpg';
import mp5Img from './mp5.jpg';
import falImg from './fal.jpg';
import topographieImg from './topographie.jpg';
import parcoursImg from './parcours.jpg';
import tactiqueImg from './tactique.jpg';
import secourismeImg from './secourisme.jpg';

export const sportImages: Record<string, string> = {
  // Sports balls
  football: footballImg,
  basketball: basketballImg,
  volleyball: volleyballImg,
  handball: handballImg,
  tennis: tennisImg,
  rugby: rugbyImg,
  
  // Sports equipment
  combat: combatImg,
  endurance: enduranceImg,
  nutrition: nutritionImg,
  sportif: sportifImg,
  natation: natationImg,
  
  // Military weapons
  militaire: militaireImg,
  ak47: ak47Img,
  m16: m16Img,
  mp5: mp5Img,
  fal: falImg,
  
  // Military courses
  topographie: topographieImg,
  parcours: parcoursImg,
  tactique: tactiqueImg,
  secourisme: secourismeImg,
  
  // Default fallback
  default: sportifImg,
};

export const getSportImage = (key: string): string => {
  return sportImages[key.toLowerCase()] || sportImages.default;
};

// Image categories for the UI
export const imageCategories = {
  sports: ['football', 'basketball', 'volleyball', 'handball', 'tennis', 'rugby', 'natation'],
  equipment: ['combat', 'endurance', 'nutrition', 'sportif'],
  weapons: ['ak47', 'm16', 'mp5', 'fal'],
  military: ['militaire', 'topographie', 'parcours', 'tactique', 'secourisme'],
};

export const allImageOptions = Object.keys(sportImages).filter(k => k !== 'default');

// Sport images index
import basketballImg from './basketball.jpg';
import volleyballImg from './volleyball.jpg';
import handballImg from './handball.jpg';
import nutritionImg from './nutrition.jpg';
import combatImg from './combat.jpg';
import enduranceImg from './endurance.jpg';
import sportifImg from './sportif.jpg';
import militaireImg from './militaire.jpg';

export const sportImages: Record<string, string> = {
  basketball: basketballImg,
  volleyball: volleyballImg,
  handball: handballImg,
  nutrition: nutritionImg,
  combat: combatImg,
  endurance: enduranceImg,
  sportif: sportifImg,
  militaire: militaireImg,
  default: sportifImg,
};

export const getSportImage = (key: string): string => {
  return sportImages[key.toLowerCase()] || sportImages.default;
};

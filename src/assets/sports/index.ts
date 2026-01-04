// ============= COMPREHENSIVE SPORTS & MILITARY IMAGE LIBRARY =============

// ===== SPORTS SECTION =====

// Ball Sports
import footballBallImg from './football_ball.jpg';
import basketballBallImg from './basketball_ball.jpg';
import volleyballBallImg from './volleyball_ball.jpg';
import handballBallImg from './handball_ball.jpg';
import tennisBallImg from './tennis_ball.jpg';
import rugbyBallImg from './rugby_ball.jpg';
import beachSoccerImg from './beach_soccer.jpg';

// Combat & Martial Arts
import boxingGlovesImg from './boxing_gloves.jpg';
import taekwondoGearImg from './taekwondo_gear.jpg';
import wrestlingMatImg from './wrestling_mat.jpg';
import combatTrainingImg from './combat_training.jpg';

// Athletics & Gym
import athleticsTrackImg from './athletics_track.jpg';
import gymnasticsEquipmentImg from './gymnastics_equipment.jpg';
import fitnessWeightsImg from './fitness_weights.jpg';
import runningGearImg from './running_gear.jpg';
import agilityTrainingImg from './agility_training.jpg';

// Aquatic Activities
import swimmingPoolImg from './swimming_pool.jpg';
import swimmingGearImg from './swimming_gear.jpg';

// Facilities & Programs
import indoorHallImg from './indoor_hall.jpg';
import youthAcademyImg from './youth_academy.jpg';

// Nutrition
import nutritionFoodImg from './nutrition_food.jpg';

// ===== MILITARY SECTION =====

// Weapons
import ak47RifleImg from './ak47_rifle.jpg';
import m16RifleImg from './m16_rifle.jpg';
import mp5WeaponImg from './mp5_weapon.jpg';
import falRifleImg from './fal_rifle.jpg';

// Military Training
import obstacleCourseImg from './obstacle_course.jpg';
import tacticalFieldImg from './tactical_field.jpg';
import militaryEnduranceImg from './military_endurance.jpg';
import topographyEquipmentImg from './topography_equipment.jpg';
import firstAidImg from './first_aid.jpg';

// Legacy imports (keeping for backwards compatibility)
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
  // ===== SPORTS BALLS =====
  football_ball: footballBallImg,
  basketball_ball: basketballBallImg,
  volleyball_ball: volleyballBallImg,
  handball_ball: handballBallImg,
  tennis_ball: tennisBallImg,
  rugby_ball: rugbyBallImg,
  beach_soccer: beachSoccerImg,
  
  // ===== COMBAT & MARTIAL ARTS =====
  boxing: boxingGlovesImg,
  taekwondo: taekwondoGearImg,
  wrestling: wrestlingMatImg,
  combat_training: combatTrainingImg,
  
  // ===== ATHLETICS & GYM =====
  athletics: athleticsTrackImg,
  gymnastics: gymnasticsEquipmentImg,
  fitness: fitnessWeightsImg,
  running: runningGearImg,
  agility: agilityTrainingImg,
  
  // ===== AQUATIC =====
  swimming_pool: swimmingPoolImg,
  swimming_gear: swimmingGearImg,
  
  // ===== FACILITIES & PROGRAMS =====
  indoor_hall: indoorHallImg,
  youth_academy: youthAcademyImg,
  
  // ===== NUTRITION =====
  nutrition_food: nutritionFoodImg,
  
  // ===== MILITARY WEAPONS =====
  ak47_rifle: ak47RifleImg,
  m16_rifle: m16RifleImg,
  mp5_weapon: mp5WeaponImg,
  fal_rifle: falRifleImg,
  
  // ===== MILITARY TRAINING =====
  obstacle_course: obstacleCourseImg,
  tactical_field: tacticalFieldImg,
  military_endurance: militaryEnduranceImg,
  topography: topographyEquipmentImg,
  first_aid: firstAidImg,
  
  // ===== LEGACY (backwards compatibility) =====
  football: footballImg,
  basketball: basketballImg,
  volleyball: volleyballImg,
  handball: handballImg,
  tennis: tennisImg,
  rugby: rugbyImg,
  combat: combatImg,
  endurance: enduranceImg,
  nutrition: nutritionImg,
  sportif: sportifImg,
  natation: natationImg,
  militaire: militaireImg,
  ak47: ak47Img,
  m16: m16Img,
  mp5: mp5Img,
  fal: falImg,
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

// ===== IMAGE CATEGORIES FOR UI =====
export const imageCategories = {
  // Sports Section
  ballSports: [
    'football_ball', 'basketball_ball', 'volleyball_ball', 
    'handball_ball', 'tennis_ball', 'rugby_ball', 'beach_soccer'
  ],
  combatSports: [
    'boxing', 'taekwondo', 'wrestling', 'combat_training'
  ],
  athleticsGym: [
    'athletics', 'gymnastics', 'fitness', 'running', 'agility'
  ],
  aquatic: [
    'swimming_pool', 'swimming_gear'
  ],
  facilities: [
    'indoor_hall', 'youth_academy', 'nutrition_food'
  ],
  
  // Military Section
  weapons: [
    'ak47_rifle', 'm16_rifle', 'mp5_weapon', 'fal_rifle'
  ],
  militaryTraining: [
    'obstacle_course', 'tactical_field', 'military_endurance', 
    'topography', 'first_aid'
  ],
  
  // Legacy categories (for backwards compatibility)
  sports: ['football', 'basketball', 'volleyball', 'handball', 'tennis', 'rugby', 'natation'],
  equipment: ['combat', 'endurance', 'nutrition', 'sportif'],
  military: ['militaire', 'topographie', 'parcours', 'tactique', 'secourisme'],
};

// Category labels for UI
export const categoryLabels: Record<string, string> = {
  ballSports: 'Sports de Ballon',
  combatSports: 'Sports de Combat',
  athleticsGym: 'Athlétisme & Gym',
  aquatic: 'Sports Aquatiques',
  facilities: 'Installations & Programmes',
  weapons: 'Armes Militaires',
  militaryTraining: 'Entraînement Militaire',
};

// Get all available image keys
export const allImageOptions = Object.keys(sportImages).filter(k => k !== 'default');

// Get images by section
export const getSportsSectionImages = () => [
  ...imageCategories.ballSports,
  ...imageCategories.combatSports,
  ...imageCategories.athleticsGym,
  ...imageCategories.aquatic,
  ...imageCategories.facilities,
];

export const getMilitarySectionImages = () => [
  ...imageCategories.weapons,
  ...imageCategories.militaryTraining,
];

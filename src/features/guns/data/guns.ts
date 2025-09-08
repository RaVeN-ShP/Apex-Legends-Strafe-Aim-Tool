import { Gun } from '@/features/guns/types/gun';

import R301Icon from '@/features/guns/assets/weapons/ar/R-301_Carbine_Icon.svg';
import R99Icon from '@/features/guns/assets/weapons/smg/R-99_SMG_Icon.svg';
import SpitfireIcon from '@/features/guns/assets/weapons/lmg/M600_Spitfire_Icon.svg';
import AlternatorIcon from '@/features/guns/assets/weapons/smg/Alternator_SMG_Icon.svg';
import HavocIcon from '@/features/guns/assets/weapons/ar/HAVOC_Rifle_Icon.svg';
import VoltIcon from '@/features/guns/assets/weapons/smg/Volt_SMG_Icon.svg';
import DevotionIcon from '@/features/guns/assets/weapons/lmg/Devotion_LMG_Icon.svg';
import LstarIcon from '@/features/guns/assets/weapons/lmg/L-STAR_EMG_Icon.svg';
import NemesisIcon from '@/features/guns/assets/weapons/ar/Nemesis_Burst_AR_Icon.svg';
import RE45Icon from '@/features/guns/assets/weapons/pistol/RE-45_Auto_Icon.svg';
import FlatlineIcon from '@/features/guns/assets/weapons/ar/VK-47_Flatline_Icon.svg';
import CARIcon from '@/features/guns/assets/weapons/smg/C.A.R._SMG_Icon.svg';
import ProwlerIcon from '@/features/guns/assets/weapons/smg/Prowler_Burst_PDW_Icon.svg';
import RampageIcon from '@/features/guns/assets/weapons/lmg/Rampage_LMG_Icon.svg';
import HemlokIcon from '@/features/guns/assets/weapons/ar/Hemlok_Burst_AR_Icon.svg';


export const guns: Gun[] = [
  {
    id: 'r301',
    name: 'R-301 Carbine',
    category: 'ar',
    image: R301Icon,
    ammo: 'light',
    reloadTimeSeconds: 2.4,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'right', duration: 800 },
        { type: 'direction', direction: 'left', duration: 530 },
        { type: 'direction', direction: 'right', duration: 880 },
      ],
    },
  },
  {
    id: 'r99',
    name: 'R-99 SMG',
    category: 'smg',
    image: R99Icon,
    ammo: 'light',
    reloadTimeSeconds: 2.21,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'right', duration: 390 },
        { type: 'direction', direction: 'left', duration: 270 },
        { type: 'direction', direction: 'right', duration: 290 },
        { type: 'direction', direction: 'left', duration: 220 },
        { type: 'direction', direction: 'right', duration: 280 },
      ],
    },
  },
  {
    id: 'spitfire',
    name: 'M600 Spitfire',
    category: 'lmg',
    image: SpitfireIcon,
    ammo: 'light',
    reloadTimeSeconds: 3.78,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'left', duration: 430 },
        { type: 'direction', direction: 'right', duration: 670 },
        { type: 'direction', direction: 'left', duration: 1110 },
        { type: 'direction', direction: 'right', duration: 1440 },
        { type: 'direction', direction: 'left', duration: 1330 },
        { type: 'direction', direction: 'right', duration: 460 },
      ],
    },
  },
  {
    id: 'alternator',
    name: 'Alternator SMG',
    category: 'smg',
    image: AlternatorIcon,
    ammo: 'light',
    reloadTimeSeconds: 2.01,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'left', duration: 600 },
        { type: 'direction', direction: 'right', duration: 700 },
        { type: 'direction', direction: 'left', duration: 800 },
        { type: 'direction', direction: 'right', duration: 710 },
      ],
    },
  },
  {
    id: 'havoc',
    name: 'HAVOC Rifle',
    category: 'ar',
    image: HavocIcon,
    ammo: 'energy',
    reloadTimeSeconds: 2.88,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      normal: [
        { type: 'shoot', duration: 350 },
        { type: 'direction', direction: 'right', duration: 370 },
        { type: 'direction', direction: 'left', duration: 350 },
        { type: 'direction', direction: 'right', duration: 630 },
        { type: 'direction', direction: 'left', duration: 1150 },
      ],
      turbocharged: [
        { type: 'direction', direction: 'right', duration: 370 },
        { type: 'direction', direction: 'left', duration: 350 },
        { type: 'direction', direction: 'right', duration: 630 },
        { type: 'direction', direction: 'left', duration: 1150 },
      ]
    },
  },
  {
    id: 'volt',
    name: 'Volt SMG',
    category: 'smg',
    image: VoltIcon,
    ammo: 'energy',
    reloadTimeSeconds: 1.83,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'right', duration: 750 },
        { type: 'direction', direction: 'left', duration: 420 },
        { type: 'direction', direction: 'right', duration: 250 },
        { type: 'direction', direction: 'left', duration: 750 },
      ],
    },
  },
  {
    id: 'devotion',
    name: 'Devotion LMG',
    category: 'lmg',
    image: DevotionIcon,
    ammo: 'energy',
    reloadTimeSeconds: 3.27,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      normal: [
        { type: 'direction', direction: 'right', duration: 500 },
        { type: 'direction', direction: 'left', duration: 1190 },
        { type: 'direction', direction: 'right', duration: 1450 },
        { type: 'direction', direction: 'left', duration: 530 },
      ],
      Turbocharged: [
        { type: 'direction', direction: 'right', duration: 270 },
        { type: 'direction', direction: 'left', duration: 1080 },
        { type: 'direction', direction: 'right', duration: 1400 },
        { type: 'direction', direction: 'left', duration: 760 },
      ],
    },
  },
  {
    id: 'lstar',
    name: 'L-STAR EMG',
    category: 'lmg',
    image: LstarIcon,
    ammo: 'energy',
    reloadTimeSeconds: 2.21,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'left', duration: 300 },
        { type: 'direction', direction: 'right', duration: 2400 },
      ],
    },
  },
  {
    id: 'nemesis',
    name: 'Nemesis Burst AR',
    category: 'ar',
    image: NemesisIcon,
    ammo: 'energy',
    reloadTimeSeconds: 2.43,
    remarks: ['Use a purple stock & magazine', 'Pattern works for fully charged Nemesis'],
    pattern: {
      default: [
        { type: 'direction', direction: 'right', duration: 330 },
        { type: 'direction', direction: 'left', duration: 330 },
        { type: 'direction', direction: 'left', duration: 330 },
        { type: 'direction', direction: 'right', duration: 330 },
        { type: 'direction', direction: 'left', duration: 330 },
        { type: 'direction', direction: 'left', duration: 330 },
        { type: 'direction', direction: 'right', duration: 330 },
        { type: 'direction', direction: 'left', duration: 330 },
      ],
    },
  },
  {
    id: 're45',
    name: 'RE-45 Burst',
    category: 'pistol',
    image: RE45Icon,
    ammo: 'energy',
    reloadTimeSeconds: 1.95,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'shoot', duration: 400 },
        { type: 'direction', direction: 'left', duration: 250 },
        { type: 'direction', direction: 'left', duration: 250 },
        { type: 'direction', direction: 'right', duration: 250 },
        { type: 'direction', direction: 'right', duration: 250 },
        { type: 'direction', direction: 'left', duration: 250 },
        { type: 'direction', direction: 'left', duration: 250 },
        { type: 'direction', direction: 'right', duration: 250 },
        { type: 'direction', direction: 'right', duration: 250 },
      ],
    },
  },
  {
    id: 'flatline',
    name: 'VK-47 Flatline',
    category: 'ar',
    image: FlatlineIcon,
    ammo: 'heavy',
    reloadTimeSeconds: 2.79,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'left', duration: 600 },
        { type: 'direction', direction: 'right', duration: 500  },
        { type: 'direction', direction: 'left', duration: 1100 },
        { type: 'direction', direction: 'right', duration: 610 },
      ],
    },
  },
  {
    id: 'car',
    name: 'C.A.R. SMG',
    category: 'smg',
    image: CARIcon,
    ammo: 'heavy',
    reloadTimeSeconds: 1.92,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'left', duration: 470 },
        { type: 'direction', direction: 'right', duration: 380 },
        { type: 'direction', direction: 'left', duration: 250 },
        { type: 'direction', direction: 'right', duration: 330 },
        { type: 'direction', direction: 'left', duration: 320 },
      ],
    },
  },
  {
    id: 'prowler-auto',
    name: 'Prowler (Auto)',
    category: 'smg',
    image: ProwlerIcon,
    ammo: 'heavy',
    reloadTimeSeconds: 2.34,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'left', duration: 990 },
        { type: 'direction', direction: 'right', duration: 660 },
        { type: 'direction', direction: 'left', duration: 380 },
        { type: 'direction', direction: 'right', duration: 530 },
      ],
    },
  },
  {
    id: 'rampage',
    name: 'Rampage LMG',
    category: 'lmg',
    image: RampageIcon,
    ammo: 'heavy',
    reloadTimeSeconds: 3.6,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      'normal': [
        { type: 'direction', direction: 'left', duration: 620 },
        { type: 'direction', direction: 'right', duration: 1230 },
        { type: 'direction', direction: 'left', duration: 6100 },
      ],
      'charged': [
        { type: 'direction', direction: 'left', duration: 450 },
        { type: 'direction', direction: 'right', duration: 940 },
        { type: 'direction', direction: 'left', duration: 4600 },
      ],
    },
  },
  {
    id: 'prowler-burst',
    name: 'Prowler (Burst)',
    category: 'smg',
    image: ProwlerIcon,
    ammo: 'heavy',
    reloadTimeSeconds: 2.34,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'left', duration: 450 },
        { type: 'direction', direction: 'left', duration: 450 },
        { type: 'direction', direction: 'left', duration: 450 },
        { type: 'direction', direction: 'right', duration: 450 },
        { type: 'direction', direction: 'right', duration: 450 },
        { type: 'direction', direction: 'right', duration: 450 },
        { type: 'direction', direction: 'left', duration: 450 },
      ],
    },
  },
  {
    id: 'hemlok',
    name: 'Hemlok Burst AR',
    category: 'ar',
    image: HemlokIcon,
    ammo: 'heavy',
    reloadTimeSeconds: 2.57,
    remarks: ['Use a purple stock & magazine'],
    pattern: {
      default: [
        { type: 'direction', direction: 'left', duration: 370 },
        { type: 'direction', direction: 'left', duration: 370 },
        { type: 'direction', direction: 'left', duration: 370 },
        { type: 'direction', direction: 'right', duration: 370 },
        { type: 'direction', direction: 'right', duration: 370 },
        { type: 'direction', direction: 'left', duration: 370 },
        { type: 'direction', direction: 'left', duration: 370 },
        { type: 'direction', direction: 'right', duration: 370 },
        { type: 'direction', direction: 'right', duration: 370 },
        { type: 'direction', direction: 'right', duration: 370 },
      ],
    },
  }
];

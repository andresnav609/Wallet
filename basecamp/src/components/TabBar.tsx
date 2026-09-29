import { NavLink } from 'react-router-dom';
import { IconCalendar, IconChart, IconHome, IconList, IconUser } from './Icons';

const tabs = [
  { to: '/', label: 'Today', Icon: IconHome },
  { to: '/plan', label: 'Plan', Icon: IconCalendar },
  { to: '/exercises', label: 'Exercises', Icon: IconList },
  { to: '/progress', label: 'Progress', Icon: IconChart },
  { to: '/profile', label: 'Profile', Icon: IconUser },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `tab${isActive ? ' active' : ''}`} aria-label={label}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

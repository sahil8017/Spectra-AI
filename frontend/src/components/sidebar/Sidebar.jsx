// src/components/Sidebar.jsx
import { useState } from 'react';
import { 
    MessageSquare, 
    Search, 
    LayoutDashboard, 
    Settings, 
    ChevronLeft, 
    ChevronRight 
} from 'lucide-react';
import PropTypes from 'prop-types';

// Reusable NavItem component
const NavItem = ({ icon, text, isExpanded, active }) => {
    return (
        <li className={`
            relative flex items-center py-2 px-3 my-1
            font-medium rounded-md cursor-pointer
            transition-colors group
            ${active 
                ? "bg-gradient-to-tr from-indigo-200 to-indigo-100 text-indigo-800" 
                : "hover:bg-indigo-50 text-gray-600"
            }
        `}>
            {icon}
            <span className={`
                overflow-hidden transition-all 
                ${isExpanded ? "w-40 ml-3" : "w-0"}
            `}>
                {text}
            </span>

            {/* Tooltip */}
            {!isExpanded && (
                <div className={`
                    absolute left-full rounded-md px-2 py-1 ml-6
                    bg-indigo-100 text-indigo-800 text-sm
                    invisible opacity-20 -translate-x-3 transition-all
                    group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
                `}>
                    {text}
                </div>
            )}
        </li>
    );
};


export default function Sidebar({ isExpanded, onToggle, recentChats }) {
    const [search, setSearch] = useState("");
    const filteredChats = recentChats.filter(chat =>
        chat.title.toLowerCase().includes(search.toLowerCase())
    );
    return (
        <aside className={`sidebar${isExpanded ? ' expanded' : ' collapsed'}`}>
            <nav className="h-full flex flex-col bg-white border-r shadow-sm">
                <div className="p-4 pb-2 flex justify-between items-center sidebar-header">
                    <img
                        src="https://img.logoipsum.com/243.svg"
                        className={`overflow-hidden transition-all ${isExpanded ? "w-32" : "w-0"}`}
                        alt="logo"
                    />
                    <button
                        onClick={onToggle}
                        className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 sidebar-toggle-button"
                    >
                        {isExpanded ? <ChevronLeft /> : <ChevronRight />}
                    </button>
                </div>
                <div className="sidebar-search-chat">
                    <Search size={20} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search chats"
                        className="sidebar-text"
                    />
                </div>
                <ul className="flex-1 px-3 recent-chats-list">
                    {filteredChats.map(chat => (
                        <li key={chat.id}>
                            <span className="nav-text">{chat.title}</span>
                        </li>
                    ))}
                </ul>
                <div className="border-t flex p-3 sidebar-footer">
                    <img
                        src="https://ui-avatars.com/api/?background=c7d2fe&color=3730a3&bold=true&name=SA"
                        className="w-10 h-10 rounded-md"
                        alt="user avatar"
                    />
                    <div className={`flex justify-between items-center overflow-hidden transition-all ${isExpanded ? "w-52 ml-3" : "w-0"}`}>
                        <div className="leading-4">
                            <h4 className="font-semibold">Sandeep</h4>
                            <span className="text-xs text-gray-600">sandeep@google.com</span>
                        </div>
                        <Settings size={20} />
                    </div>
                </div>
            </nav>
        </aside>
    );
}
Sidebar.propTypes = {
    isExpanded: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    recentChats: PropTypes.array.isRequired,
};
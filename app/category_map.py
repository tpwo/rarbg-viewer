from __future__ import annotations

from enum import StrEnum


class Movies(StrEnum):
    MOVIES = 'movies'
    MOVIES_BD_FULL = 'movies_bd_full'
    MOVIES_BD_REMUX = 'movies_bd_remux'
    MOVIES_X264 = 'movies_x264'
    MOVIES_X264_3D = 'movies_x264_3d'
    MOVIES_X264_4K = 'movies_x264_4k'
    MOVIES_X264_720 = 'movies_x264_720'
    MOVIES_X265 = 'movies_x265'
    MOVIES_X265_4K = 'movies_x265_4k'
    MOVIES_X265_4K_HDR = 'movies_x265_4k_hdr'
    MOVIES_XVID = 'movies_xvid'
    MOVIES_XVID_720 = 'movies_xvid_720'


class TV(StrEnum):
    TV = 'tv'
    TV_SD = 'tv_sd'
    TV_UHD = 'tv_uhd'


class Games(StrEnum):
    GAMES_PC_ISO = 'games_pc_iso'
    GAMES_PC_RIP = 'games_pc_rip'
    GAMES_PS3 = 'games_ps3'
    GAMES_PS4 = 'games_ps4'
    GAMES_XBOX360 = 'games_xbox360'


class Music(StrEnum):
    MUSIC_FLAC = 'music_flac'
    MUSIC_MP3 = 'music_mp3'


class Books(StrEnum):
    EBOOKS = 'ebooks'


class Software(StrEnum):
    SOFTWARE_PC_ISO = 'software_pc_iso'


class Adult(StrEnum):
    XXX = 'xxx'


CATEGORY_MAP = {
    'Movies': {e.value for e in Movies},
    'TV': {e.value for e in TV},
    'Games': {e.value for e in Games},
    'Music': {e.value for e in Music},
    'Books': {e.value for e in Books},
    'Software': {e.value for e in Software},
    'Adult': {e.value for e in Adult},
}

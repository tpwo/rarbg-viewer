package main

const (
	// Movies
	MOVIES             = "movies"
	MOVIES_BD_FULL     = "movies_bd_full"
	MOVIES_BD_REMUX    = "movies_bd_remux"
	MOVIES_X264        = "movies_x264"
	MOVIES_X264_3D     = "movies_x264_3d"
	MOVIES_X264_4K     = "movies_x264_4k"
	MOVIES_X264_720    = "movies_x264_720"
	MOVIES_X265        = "movies_x265"
	MOVIES_X265_4K     = "movies_x265_4k"
	MOVIES_X265_4K_HDR = "movies_x265_4k_hdr"
	MOVIES_XVID        = "movies_xvid"
	MOVIES_XVID_720    = "movies_xvid_720"

	// TV
	TV     = "tv"
	TV_SD  = "tv_sd"
	TV_UHD = "tv_uhd"

	// Games
	GAMES_PC_ISO  = "games_pc_iso"
	GAMES_PC_RIP  = "games_pc_rip"
	GAMES_PS3     = "games_ps3"
	GAMES_PS4     = "games_ps4"
	GAMES_XBOX360 = "games_xbox360"

	// Music
	MUSIC_FLAC = "music_flac"
	MUSIC_MP3  = "music_mp3"

	// Books
	EBOOKS = "ebooks"

	// Software
	SOFTWARE_PC_ISO = "software_pc_iso"

	// Adult
	XXX = "xxx"
)

var CategoryMap = map[string][]string{
	"Movies": {
		MOVIES, MOVIES_BD_FULL, MOVIES_BD_REMUX, MOVIES_X264, MOVIES_X264_3D,
		MOVIES_X264_4K, MOVIES_X264_720, MOVIES_X265, MOVIES_X265_4K,
		MOVIES_X265_4K_HDR, MOVIES_XVID, MOVIES_XVID_720,
	},
	"TV":       {TV, TV_SD, TV_UHD},
	"Games":    {GAMES_PC_ISO, GAMES_PC_RIP, GAMES_PS3, GAMES_PS4, GAMES_XBOX360},
	"Music":    {MUSIC_FLAC, MUSIC_MP3},
	"Books":    {EBOOKS},
	"Software": {SOFTWARE_PC_ISO},
	"Adult":    {XXX},
}

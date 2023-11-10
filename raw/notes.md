# Raw Data Notes

## STOP_AREA

- 0: 32 bit Integer: number of entries
[
- 0: String, Split using "/"
    - 0: String = type
    - 1: String: Split using ":"
        0: String: -> toUpperCase: uuid
        1: String: -> Hex to Int: Int || 0 = major
        2: String: -> Hex to Int: Int || 0 = minor
- 1: String = globalId
- 2: Int: /100 = Lat
- 3: Int: /100 = Long
- 4: Short: level
- 5: Short: elevation
]

string reading: read until 0
int reading: little endian, varying size

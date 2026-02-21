export type WynntilsArg = { name: string; type: string; required: boolean; default: string | null };
export type WynntilsFn = { name: string; aliases: string[]; description: string; return: string; args: WynntilsArg[] };
export const WYNNTILS_FUNCS: WynntilsFn[] = [
  {
    "name": "at_cap",
    "aliases": [],
    "description": "Is the capped value at maximum?",
    "return": "Boolean",
    "args": [
      {
        "name": "capped",
        "type": "CappedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "cap",
    "aliases": [],
    "description": "The maximum value from this capped value",
    "return": "Integer",
    "args": [
      {
        "name": "capped",
        "type": "CappedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "capped",
    "aliases": [],
    "description": "A capped value from current value and cap",
    "return": "CappedValue",
    "args": [
      {
        "name": "current",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "cap",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "current",
    "aliases": [
      "curr"
    ],
    "description": "The current value from this capped value",
    "return": "Integer",
    "args": [
      {
        "name": "capped",
        "type": "CappedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "percentage",
    "aliases": [
      "pct"
    ],
    "description": "The percentage (0-100) of this capped value",
    "return": "Double",
    "args": [
      {
        "name": "capped",
        "type": "CappedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "remaining",
    "aliases": [
      "rem"
    ],
    "description": "The difference between cap and current value",
    "return": "Integer",
    "args": [
      {
        "name": "capped",
        "type": "CappedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "blink_shader",
    "aliases": [],
    "description": "Returns color value that triggers Wynncraft's blink text shader",
    "return": "CustomColor",
    "args": []
  },
  {
    "name": "brightness_shift",
    "aliases": [],
    "description": "Shifts the brightness of provided color",
    "return": "CustomColor",
    "args": [
      {
        "name": "color",
        "type": "CustomColor",
        "required": true,
        "default": null
      },
      {
        "name": "degree",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "fade_shader",
    "aliases": [],
    "description": "Returns color value that triggers Wynncraft's fade text shader",
    "return": "CustomColor",
    "args": []
  },
  {
    "name": "from_hex",
    "aliases": [],
    "description": "Returns a color value based on provided hex argument",
    "return": "CustomColor",
    "args": [
      {
        "name": "hex",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "from_rgb",
    "aliases": [],
    "description": "Returns a color value based on provided RGB arguments",
    "return": "CustomColor",
    "args": [
      {
        "name": "r",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "g",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "b",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "from_rgb_percent",
    "aliases": [],
    "description": "Returns a color value based on provided RGB arguments",
    "return": "CustomColor",
    "args": [
      {
        "name": "r",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "g",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "b",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "gradient_shader",
    "aliases": [],
    "description": "Returns color value that triggers Wynncraft's gradient text shader",
    "return": "CustomColor",
    "args": [
      {
        "name": "style",
        "type": "Integer",
        "required": false,
        "default": "1"
      }
    ]
  },
  {
    "name": "hue_shift",
    "aliases": [],
    "description": "Shifts the hue of provided color",
    "return": "CustomColor",
    "args": [
      {
        "name": "color",
        "type": "CustomColor",
        "required": true,
        "default": null
      },
      {
        "name": "degree",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "rainbow_shader",
    "aliases": [],
    "description": "Returns color value that triggers Wynncraft's rainbow text shader",
    "return": "CustomColor",
    "args": []
  },
  {
    "name": "saturation_shift",
    "aliases": [],
    "description": "Shifts the saturation of provided color",
    "return": "CustomColor",
    "args": [
      {
        "name": "color",
        "type": "CustomColor",
        "required": true,
        "default": null
      },
      {
        "name": "degree",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "shine_shader",
    "aliases": [],
    "description": "Returns color value that triggers Wynncraft's shine text shader",
    "return": "CustomColor",
    "args": []
  },
  {
    "name": "to_hex_string",
    "aliases": [],
    "description": "Returns a hex string representation of provided color",
    "return": "String",
    "args": [
      {
        "name": "color",
        "type": "CustomColor",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "if_capped_value",
    "aliases": [
      "if_capped,if_cap"
    ],
    "description": "If the condition is true, the first value is returned, otherwise the second value is returned",
    "return": "CappedValue",
    "args": [
      {
        "name": "condition",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "ifTrue",
        "type": "CappedValue",
        "required": true,
        "default": null
      },
      {
        "name": "ifFalse",
        "type": "CappedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "if_custom_color",
    "aliases": [
      "if_color,if_customcolor"
    ],
    "description": "If the condition is true, the first value is returned, otherwise the second value is returned",
    "return": "CustomColor",
    "args": [
      {
        "name": "condition",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "ifTrue",
        "type": "CustomColor",
        "required": true,
        "default": null
      },
      {
        "name": "ifFalse",
        "type": "CustomColor",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "if",
    "aliases": [],
    "description": "If the condition is true, the first value is returned, otherwise the second value is returned",
    "return": "Object",
    "args": [
      {
        "name": "condition",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "ifTrue",
        "type": "Object",
        "required": true,
        "default": null
      },
      {
        "name": "ifFalse",
        "type": "Object",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "if_number",
    "aliases": [
      "if_num"
    ],
    "description": "If the condition is true, the first value is returned, otherwise the second value is returned",
    "return": "Number",
    "args": [
      {
        "name": "condition",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "ifTrue",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "ifFalse",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "if_string",
    "aliases": [
      "if_str"
    ],
    "description": "If the condition is true, the first value is returned, otherwise the second value is returned",
    "return": "String",
    "args": [
      {
        "name": "condition",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "ifTrue",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "ifFalse",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "distance",
    "aliases": [],
    "description": "Distance between two locations (in meters)",
    "return": "Double",
    "args": [
      {
        "name": "first",
        "type": "Location",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Location",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "location",
    "aliases": [
      "loc"
    ],
    "description": "Creates a location from three coordinates",
    "return": "Location",
    "args": [
      {
        "name": "x",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "y",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "z",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "x",
    "aliases": [],
    "description": "Extracts the X coordinate from a location",
    "return": "Integer",
    "args": [
      {
        "name": "location",
        "type": "Location",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "y",
    "aliases": [],
    "description": "Extracts the Y coordinate from a location",
    "return": "Integer",
    "args": [
      {
        "name": "location",
        "type": "Location",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "z",
    "aliases": [],
    "description": "Extracts the Z coordinate from a location",
    "return": "Integer",
    "args": [
      {
        "name": "location",
        "type": "Location",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "and",
    "aliases": [],
    "description": "Checks if all conditions are true",
    "return": "Boolean",
    "args": [
      {
        "name": "values",
        "type": "List",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "equals",
    "aliases": [
      "eq"
    ],
    "description": "Checks if two numbers are equal",
    "return": "Boolean",
    "args": [
      {
        "name": "first",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "greater_than",
    "aliases": [
      "mt,more_than,gt"
    ],
    "description": "Checks if the first value is greater than the second",
    "return": "Boolean",
    "args": [
      {
        "name": "first",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "greater_than_or_equals",
    "aliases": [
      "mte,more_than_equals,greater_than_equals,gte,geq"
    ],
    "description": "Checks if the first value is greater than or equal to the second",
    "return": "Boolean",
    "args": [
      {
        "name": "first",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "less_than",
    "aliases": [
      "lt"
    ],
    "description": "Checks if the first value is less than the second",
    "return": "Boolean",
    "args": [
      {
        "name": "first",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "less_than_or_equals",
    "aliases": [
      "lte,less_than_equals,leq"
    ],
    "description": "Checks if the first value is less than or equal to the second",
    "return": "Boolean",
    "args": [
      {
        "name": "first",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "not_equals",
    "aliases": [
      "neq"
    ],
    "description": "Checks if two values are not equal",
    "return": "Boolean",
    "args": [
      {
        "name": "first",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "not",
    "aliases": [],
    "description": "Negates a boolean",
    "return": "Boolean",
    "args": [
      {
        "name": "value",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "or",
    "aliases": [],
    "description": "Checks if any condition is true",
    "return": "Boolean",
    "args": [
      {
        "name": "values",
        "type": "List",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "add",
    "aliases": [],
    "description": "Adds any amount of numbers together",
    "return": "Double",
    "args": [
      {
        "name": "values",
        "type": "List",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "divide",
    "aliases": [
      "div"
    ],
    "description": "Divides two numbers",
    "return": "Double",
    "args": [
      {
        "name": "dividend",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "divisor",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "integer",
    "aliases": [
      "int"
    ],
    "description": "Converts any number type to an integer",
    "return": "Integer",
    "args": [
      {
        "name": "value",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "long",
    "aliases": [],
    "description": "Converts any number type to a long",
    "return": "Long",
    "args": [
      {
        "name": "value",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "max",
    "aliases": [],
    "description": "The largest of all numbers provided",
    "return": "Double",
    "args": [
      {
        "name": "values",
        "type": "List",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "min",
    "aliases": [],
    "description": "The smallest of all numbers provided",
    "return": "Double",
    "args": [
      {
        "name": "values",
        "type": "List",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "modulo",
    "aliases": [
      "mod"
    ],
    "description": "Returns the modulo (remainder of division) of two numbers",
    "return": "Double",
    "args": [
      {
        "name": "dividend",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "divisor",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "multiply",
    "aliases": [
      "mul"
    ],
    "description": "Multiplies any amount of numbers",
    "return": "Double",
    "args": [
      {
        "name": "values",
        "type": "List",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "power",
    "aliases": [
      "pow"
    ],
    "description": "Returns the first number raised to the power of the second number",
    "return": "Double",
    "args": [
      {
        "name": "base",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "exponent",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "random",
    "aliases": [
      "rand"
    ],
    "description": "Random number between minimum and maximum (excludes max)",
    "return": "Double",
    "args": [
      {
        "name": "min",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "max",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "round",
    "aliases": [],
    "description": "Rounds a number to the specified number of decimals",
    "return": "Double",
    "args": [
      {
        "name": "value",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "decimals",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "square_root",
    "aliases": [
      "sqrt"
    ],
    "description": "Returns the square root of a number",
    "return": "Double",
    "args": [
      {
        "name": "value",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "subtract",
    "aliases": [
      "sub"
    ],
    "description": "Subtracts the second number from the first number",
    "return": "Double",
    "args": [
      {
        "name": "first",
        "type": "Number",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "name",
    "aliases": [],
    "description": "The name of this named value",
    "return": "String",
    "args": [
      {
        "name": "named",
        "type": "NamedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "named_value",
    "aliases": [
      "named"
    ],
    "description": "A named value from a name and a value",
    "return": "NamedValue",
    "args": [
      {
        "name": "name",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "value",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "value",
    "aliases": [
      "val"
    ],
    "description": "The value of this named value",
    "return": "Double",
    "args": [
      {
        "name": "named",
        "type": "NamedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "capped_string",
    "aliases": [
      "cap_str,str_cap"
    ],
    "description": "Returns formatted Capped Value with delimiter in between",
    "return": "String",
    "args": [
      {
        "name": "value",
        "type": "CappedValue",
        "required": true,
        "default": null
      },
      {
        "name": "delimiter",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "concat",
    "aliases": [],
    "description": "Concatenates any amount of strings together",
    "return": "String",
    "args": [
      {
        "name": "values",
        "type": "List",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "format_capped",
    "aliases": [],
    "description": "Formats a capped value to a shorter version.",
    "return": "String",
    "args": [
      {
        "name": "value",
        "type": "CappedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "format_date",
    "aliases": [],
    "description": "Formats a timestamp to a string version.",
    "return": "String",
    "args": [
      {
        "name": "timestamp",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "format_duration",
    "aliases": [],
    "description": "Formats seconds to a shorter version.",
    "return": "String",
    "args": [
      {
        "name": "seconds",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "format",
    "aliases": [],
    "description": "Formats a number to a shorter version.",
    "return": "String",
    "args": [
      {
        "name": "value",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "format_ranged",
    "aliases": [],
    "description": "Formats a ranged value to a shorter version.",
    "return": "String",
    "args": [
      {
        "name": "value",
        "type": "RangedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "leading_zeros",
    "aliases": [],
    "description": "Adds leading zeros to a number",
    "return": "String",
    "args": [
      {
        "name": "value",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "length",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "parse_double",
    "aliases": [],
    "description": "Parses a string to a double",
    "return": "Double",
    "args": [
      {
        "name": "value",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "parse_integer",
    "aliases": [
      "parse_int"
    ],
    "description": "Parses a string to an integer",
    "return": "Integer",
    "args": [
      {
        "name": "value",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "regex_find",
    "aliases": [],
    "description": "Checks if the given regex finds the given string",
    "return": "Boolean",
    "args": [
      {
        "name": "source",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "regex",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "regex_match",
    "aliases": [],
    "description": "Checks if the given regex matches the given string",
    "return": "Boolean",
    "args": [
      {
        "name": "source",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "regex",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "regex_replace",
    "aliases": [],
    "description": "Replaces all matches of the given regex with the given replacement",
    "return": "String",
    "args": [
      {
        "name": "source",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "regex",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "replacement",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "repeat",
    "aliases": [],
    "description": "Repeats the given string the specified amount of times",
    "return": "String",
    "args": [
      {
        "name": "value",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "count",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "string_contains",
    "aliases": [
      "contains_str"
    ],
    "description": "Checks if a string contains another string",
    "return": "Boolean",
    "args": [
      {
        "name": "source",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "substring",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "string_equals",
    "aliases": [
      "eq_str"
    ],
    "description": "Checks if two strings are equal",
    "return": "Boolean",
    "args": [
      {
        "name": "first",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "string",
    "aliases": [
      "str"
    ],
    "description": "Convert a number to a string",
    "return": "String",
    "args": [
      {
        "name": "value",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "to_roman_numerals",
    "aliases": [],
    "description": "Converts provided number to the equivalent in roman numerals",
    "return": "String",
    "args": [
      {
        "name": "number",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "absolute_time",
    "aliases": [],
    "description": "The time, formatted as an absolute date/time",
    "return": "String",
    "args": [
      {
        "name": "time",
        "type": "Time",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "format_time_advanced",
    "aliases": [
      "format_date_advanced"
    ],
    "description": "Format time to a string using an DateTimeFormatter pattern",
    "return": "String",
    "args": [
      {
        "name": "time",
        "type": "Time",
        "required": true,
        "default": null
      },
      {
        "name": "format",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "seconds_between",
    "aliases": [],
    "description": "The number of seconds between two Times, negative if the first is after the second",
    "return": "Long",
    "args": [
      {
        "name": "first",
        "type": "Time",
        "required": true,
        "default": null
      },
      {
        "name": "second",
        "type": "Time",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "seconds_since",
    "aliases": [],
    "description": "The number of seconds that has passed since a given Time, negative if the time is in the future",
    "return": "Long",
    "args": [
      {
        "name": "time",
        "type": "Time",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "time",
    "aliases": [],
    "description": "A Time from a timestamp",
    "return": "Time",
    "args": [
      {
        "name": "timestamp",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "time_offset",
    "aliases": [
      "offset"
    ],
    "description": "A new Time offset by the specified amount",
    "return": "Time",
    "args": [
      {
        "name": "time",
        "type": "Time",
        "required": true,
        "default": null
      },
      {
        "name": "offset",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "time_string",
    "aliases": [
      "time_str"
    ],
    "description": "This Time as a string",
    "return": "String",
    "args": [
      {
        "name": "time",
        "type": "Time",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "timestamp",
    "aliases": [],
    "description": "The timestamp this Time represents",
    "return": "Long",
    "args": [
      {
        "name": "time",
        "type": "Time",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "activity_color",
    "aliases": [],
    "description": "The CustomColor of the current tracked activity type",
    "return": "CustomColor",
    "args": []
  },
  {
    "name": "activity_name",
    "aliases": [],
    "description": "The name of the current tracked activity",
    "return": "String",
    "args": []
  },
  {
    "name": "activity_task",
    "aliases": [],
    "description": "The current task of the tracked activity",
    "return": "String",
    "args": [
      {
        "name": "formatted",
        "type": "Boolean",
        "required": false,
        "default": "true"
      }
    ]
  },
  {
    "name": "activity_type",
    "aliases": [],
    "description": "The type of the current tracked activity",
    "return": "String",
    "args": []
  },
  {
    "name": "is_tracking_activity",
    "aliases": [],
    "description": "Whether you are currently tracking an activity or not",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "bomb_end_time",
    "aliases": [],
    "description": "The end time of the specified bomb from the list of active bombs",
    "return": "Time",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "group",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "sortOrder",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "bomb_formatted_string",
    "aliases": [],
    "description": "Returns a formatted text of specified bomb from the list",
    "return": "String",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "group",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "sortOrder",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "bomb_length",
    "aliases": [],
    "description": "The length of the specified bomb from the list of active bombs",
    "return": "Float",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "group",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "sortOrder",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "bomb_owner",
    "aliases": [],
    "description": "The username of a player who thrown the specified bomb from the list of active bombs",
    "return": "String",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "group",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "sortOrder",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "bomb_remaining_time",
    "aliases": [],
    "description": "The remaining time of the specified bomb from the list of active bombs",
    "return": "Time",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "group",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "sortOrder",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "bomb_start_time",
    "aliases": [],
    "description": "The start time of the specified bomb from the list of active bombs",
    "return": "Time",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "group",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "sortOrder",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "bomb_type",
    "aliases": [],
    "description": "The type of the specified bomb from the list of active bombs",
    "return": "String",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "group",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "sortOrder",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "bomb_world",
    "aliases": [],
    "description": "The world of the specified bomb from the list of active bombs",
    "return": "String",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "group",
        "type": "Boolean",
        "required": true,
        "default": null
      },
      {
        "name": "sortOrder",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "aspect_tier",
    "aliases": [],
    "description": "Returns the tier of the given aspect",
    "return": "Integer",
    "args": [
      {
        "name": "aspectName",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "bps",
    "aliases": [],
    "description": "Player speed in blocks per second",
    "return": "Double",
    "args": []
  },
  {
    "name": "bps_xz",
    "aliases": [],
    "description": "Player speed in blocks per second excluding vertical movement",
    "return": "Double",
    "args": []
  },
  {
    "name": "capped_awakened_progress",
    "aliases": [],
    "description": "Your Awakened Progress",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_blood_pool",
    "aliases": [],
    "description": "Your Blood Pool",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_corrupted",
    "aliases": [],
    "description": "Your Corruption",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_focus",
    "aliases": [],
    "description": "Your Focus",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_health",
    "aliases": [],
    "description": "Your health",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_holy_power",
    "aliases": [
      "capped_sacred_surge"
    ],
    "description": "Your Holy Power",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_mana_bank",
    "aliases": [],
    "description": "Your Mana Bank",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_mana",
    "aliases": [],
    "description": "Your mana",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_ophanim",
    "aliases": [],
    "description": "Your Ophanim",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "class",
    "aliases": [],
    "description": "Name of your current class",
    "return": "String",
    "args": [
      {
        "name": "uppercase",
        "type": "Boolean",
        "required": false,
        "default": "false"
      },
      {
        "name": "showReskinnedName",
        "type": "Boolean",
        "required": false,
        "default": "true"
      }
    ]
  },
  {
    "name": "commander_activated",
    "aliases": [],
    "description": "Whether your commander is active",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "commander_duration",
    "aliases": [],
    "description": "Duration of your commander",
    "return": "Integer",
    "args": []
  },
  {
    "name": "equipped_aspect",
    "aliases": [],
    "description": "The name and tier of the equipped aspect at the given index",
    "return": "NamedValue",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "guild_objective_goal",
    "aliases": [],
    "description": "The goal of your guild objective",
    "return": "String",
    "args": []
  },
  {
    "name": "guild_objective_score",
    "aliases": [],
    "description": "The score of your guild objective",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "has_no_gui",
    "aliases": [],
    "description": "Whether your GUI is hidden or not, usually in a cutscene or menu",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "health",
    "aliases": [],
    "description": "Your current health",
    "return": "Integer",
    "args": []
  },
  {
    "name": "health_max",
    "aliases": [],
    "description": "Maximum possible health",
    "return": "Integer",
    "args": []
  },
  {
    "name": "health_pct",
    "aliases": [],
    "description": "Your current health as percentage of max",
    "return": "Double",
    "args": []
  },
  {
    "name": "hummingbirds_state",
    "aliases": [],
    "description": "Whether your hummingbirds are attacking or are with you",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "id",
    "aliases": [],
    "description": "Your character's ID",
    "return": "String",
    "args": []
  },
  {
    "name": "is_aspect_equipped",
    "aliases": [],
    "description": "Returns whether the given aspect is equipped or not",
    "return": "Boolean",
    "args": [
      {
        "name": "aspectName",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "is_riding_horse",
    "aliases": [],
    "description": "Whether you are riding a horse or not",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "mana",
    "aliases": [],
    "description": "Your current mana",
    "return": "Integer",
    "args": []
  },
  {
    "name": "mana_max",
    "aliases": [],
    "description": "Maximum possible mana",
    "return": "Integer",
    "args": []
  },
  {
    "name": "mana_pct",
    "aliases": [],
    "description": "Your current mana as percentage of max",
    "return": "Double",
    "args": []
  },
  {
    "name": "ophanim_active",
    "aliases": [],
    "description": "Is the Ophanim skill active?",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "ophanim_healing_percent",
    "aliases": [],
    "description": "Percentage of max health healed in last 10 seconds with Ophanim",
    "return": "Integer",
    "args": []
  },
  {
    "name": "ophanim_orb",
    "aliases": [],
    "description": "Returns the status of the given Ophanim orb. Returns -1 if the player doesn't have an orb with the given ID, otherwise, returns a number based on the color of the orb, 3 if it's blue, 2 if it's yellow, 1 if it's red and 0 if the orb is dead.",
    "return": "Integer",
    "args": [
      {
        "name": "orbNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "personal_objective_goal",
    "aliases": [],
    "description": "The goal of your personal objective",
    "return": "String",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": false,
        "default": "0"
      }
    ]
  },
  {
    "name": "personal_objective_score",
    "aliases": [],
    "description": "The score of your personal objective",
    "return": "CappedValue",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": false,
        "default": "0"
      }
    ]
  },
  {
    "name": "sprint",
    "aliases": [],
    "description": "Your remaining sprint stamina",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "area_damage_average",
    "aliases": [
      "adavg"
    ],
    "description": "The average damage you dealt in your area in the last specified seconds",
    "return": "Double",
    "args": [
      {
        "name": "seconds",
        "type": "Integer",
        "required": false,
        "default": "10"
      }
    ]
  },
  {
    "name": "area_damage_per_second",
    "aliases": [
      "adps"
    ],
    "description": "The damage you dealt in your area in the last second",
    "return": "Long",
    "args": []
  },
  {
    "name": "blocks_above_ground",
    "aliases": [
      "agl,above_ground_level"
    ],
    "description": "How many blocks you are above the ground (the number of air blocks below you)",
    "return": "Double",
    "args": []
  },
  {
    "name": "focused_mob_health",
    "aliases": [
      "foc_mob_hp"
    ],
    "description": "The health of the mob you are currently attacking",
    "return": "Long",
    "args": []
  },
  {
    "name": "focused_mob_health_percent",
    "aliases": [
      "foc_mob_hp_pct"
    ],
    "description": "The remaining health percentage of the mob you are currently attacking",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "focused_mob_name",
    "aliases": [
      "foc_mob_name"
    ],
    "description": "The name of the mob you are currently attacking",
    "return": "String",
    "args": []
  },
  {
    "name": "kills_per_minute",
    "aliases": [
      "kpm"
    ],
    "description": "How many mobs you have killed in the last 60 seconds",
    "return": "Integer",
    "args": [
      {
        "name": "includeShared",
        "type": "Boolean",
        "required": false,
        "default": "true"
      }
    ]
  },
  {
    "name": "last_damage_dealt",
    "aliases": [
      "last_dam"
    ],
    "description": "The last time you damaged a mob",
    "return": "Time",
    "args": []
  },
  {
    "name": "last_kill",
    "aliases": [],
    "description": "The last time you killed a mob",
    "return": "Time",
    "args": [
      {
        "name": "includeShared",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "last_spell_name",
    "aliases": [
      "recast_name"
    ],
    "description": "The name of the last spell cast",
    "return": "String",
    "args": [
      {
        "name": "burst",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "last_spell_repeat_count",
    "aliases": [
      "recast_count"
    ],
    "description": "The number of times the last spell has been cast in a row in the current burst",
    "return": "Integer",
    "args": [
      {
        "name": "burst",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "ticks_since_last_spell",
    "aliases": [
      "recast_ticks"
    ],
    "description": "The number of ticks since the last spell was cast",
    "return": "Integer",
    "args": [
      {
        "name": "burst",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "time_since_last_damage_dealt",
    "aliases": [
      "last_dam_ms"
    ],
    "description": "The time, in milliseconds, since you last damaged a mob",
    "return": "Long",
    "args": []
  },
  {
    "name": "time_since_last_kill",
    "aliases": [
      "last_kill_ms"
    ],
    "description": "The time, in milliseconds, since you last killed a mob",
    "return": "Long",
    "args": [
      {
        "name": "includeShared",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "total_area_damage",
    "aliases": [
      "total_dmg,tdmg"
    ],
    "description": "The sum of damage you dealt in your area in the last specified seconds",
    "return": "Double",
    "args": [
      {
        "name": "seconds",
        "type": "Integer",
        "required": false,
        "default": "10"
      }
    ]
  },
  {
    "name": "capped_level",
    "aliases": [],
    "description": "Your combat level",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_xp",
    "aliases": [],
    "description": "Your combat XP",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "level",
    "aliases": [
      "lvl"
    ],
    "description": "Your current combat level",
    "return": "Integer",
    "args": []
  },
  {
    "name": "xp",
    "aliases": [],
    "description": "Your current XP in this level expressed as points (formatted)",
    "return": "String",
    "args": []
  },
  {
    "name": "xp_pct",
    "aliases": [],
    "description": "Your current XP in this level expressed percentage of level up requirement",
    "return": "Double",
    "args": []
  },
  {
    "name": "xp_per_minute",
    "aliases": [
      "xpm"
    ],
    "description": "The amount of experience you gain per minute, formatted.",
    "return": "String",
    "args": []
  },
  {
    "name": "xp_per_minute_raw",
    "aliases": [
      "xpm_raw"
    ],
    "description": "The amount of experience you gain per minute, raw amount.",
    "return": "Integer",
    "args": []
  },
  {
    "name": "xp_percentage_per_minute",
    "aliases": [
      "xppm"
    ],
    "description": "The amount of experience you gain per minute, percentage.",
    "return": "Double",
    "args": []
  },
  {
    "name": "xp_raw",
    "aliases": [],
    "description": "Your current XP in this level expressed as points (raw number)",
    "return": "Integer",
    "args": []
  },
  {
    "name": "xp_req",
    "aliases": [],
    "description": "XP points needed to level up (formatted)",
    "return": "String",
    "args": []
  },
  {
    "name": "xp_req_raw",
    "aliases": [],
    "description": "XP points needed to level up (raw number)",
    "return": "Integer",
    "args": []
  },
  {
    "name": "capped_mem",
    "aliases": [
      "capped_memory"
    ],
    "description": "Memory usage of the JVM",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "clock",
    "aliases": [],
    "description": "The current time, formatted in the current locale style",
    "return": "String",
    "args": []
  },
  {
    "name": "clockm",
    "aliases": [],
    "description": "The current time, formatted to 24h format",
    "return": "String",
    "args": []
  },
  {
    "name": "mem_max",
    "aliases": [
      "memorymax,memmax"
    ],
    "description": "Maximum amount of memory available to the JVM",
    "return": "Integer",
    "args": []
  },
  {
    "name": "mem_pct",
    "aliases": [
      "memorypct,mempct"
    ],
    "description": "Percentage of available memory that is currently being used",
    "return": "Integer",
    "args": []
  },
  {
    "name": "mem_used",
    "aliases": [
      "memoryused,memused"
    ],
    "description": "Current amount of memory used by the JVM",
    "return": "Integer",
    "args": []
  },
  {
    "name": "minecraft_version",
    "aliases": [],
    "description": "Minecraft version you are now playing on",
    "return": "String",
    "args": []
  },
  {
    "name": "now",
    "aliases": [],
    "description": "The current time as a Time",
    "return": "Time",
    "args": []
  },
  {
    "name": "stopwatch_hours",
    "aliases": [],
    "description": "The number in the hours position on the stopwatch",
    "return": "Integer",
    "args": []
  },
  {
    "name": "stopwatch_milliseconds",
    "aliases": [],
    "description": "The number in the milliseconds position on the stopwatch",
    "return": "Integer",
    "args": []
  },
  {
    "name": "stopwatch_minutes",
    "aliases": [],
    "description": "The number in the minutes position on the stopwatch",
    "return": "Integer",
    "args": []
  },
  {
    "name": "stopwatch_running",
    "aliases": [],
    "description": "Checks if the stopwatch is currently running",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "stopwatch_seconds",
    "aliases": [],
    "description": "The number in the seconds position on the stopwatch",
    "return": "Integer",
    "args": []
  },
  {
    "name": "stopwatch_zero",
    "aliases": [
      "stopwatch_is_zero"
    ],
    "description": "Checks if the stopwatch is currently at zero",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "wynncraft_version",
    "aliases": [],
    "description": "Wynncraft version of the world you are playing on",
    "return": "String",
    "args": []
  },
  {
    "name": "wynntils_version",
    "aliases": [],
    "description": "Wynntils version you are now playing on",
    "return": "String",
    "args": []
  },
  {
    "name": "capped_guild_level_progress",
    "aliases": [],
    "description": "The XP progress of your guild",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_guild_objectives_progress",
    "aliases": [],
    "description": "Progress towards next objectives completed milestone",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "guild_level",
    "aliases": [],
    "description": "The Level of the Guild you are in",
    "return": "Integer",
    "args": []
  },
  {
    "name": "guild_name",
    "aliases": [],
    "description": "The name of the Guild you are currently in",
    "return": "String",
    "args": []
  },
  {
    "name": "guild_rank",
    "aliases": [],
    "description": "Your Rank in the Guild you are currently in",
    "return": "String",
    "args": []
  },
  {
    "name": "is_allied_guild",
    "aliases": [
      "is_allied,is_ally"
    ],
    "description": "Whether or not the provided guild is an ally of your guild",
    "return": "Boolean",
    "args": [
      {
        "name": "guild",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "is_guild_member",
    "aliases": [],
    "description": "Whether provided player is in your guild or not",
    "return": "Boolean",
    "args": [
      {
        "name": "member",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "objective_streak",
    "aliases": [],
    "description": "How much consecutive guild objectives you have completed",
    "return": "Integer",
    "args": []
  },
  {
    "name": "hades_party_member_health",
    "aliases": [],
    "description": "The health of given party member using Hades",
    "return": "CappedValue",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "hades_party_member_location",
    "aliases": [],
    "description": "The location of given party member using Hades",
    "return": "Location",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "hades_party_member_mana",
    "aliases": [],
    "description": "The mana of given party member using Hades",
    "return": "CappedValue",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "hades_party_member_name",
    "aliases": [],
    "description": "The name of given party member using Hades",
    "return": "String",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "capped_horse_level",
    "aliases": [],
    "description": "Your horse's level",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_horse_total_level_time",
    "aliases": [
      "h_tot_lvl_time"
    ],
    "description": "Your horse's time until max level in seconds",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_horse_xp",
    "aliases": [],
    "description": "Your horse's XP",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "horse_level",
    "aliases": [
      "h_lvl"
    ],
    "description": "Your horse's current level",
    "return": "Integer",
    "args": []
  },
  {
    "name": "horse_level_max",
    "aliases": [
      "h_mlvl"
    ],
    "description": "Your horse's maximum level",
    "return": "Integer",
    "args": []
  },
  {
    "name": "horse_level_time",
    "aliases": [
      "h_lvl_time"
    ],
    "description": "Your horse's time until level up in seconds",
    "return": "Integer",
    "args": []
  },
  {
    "name": "horse_name",
    "aliases": [
      "h_name"
    ],
    "description": "Your horse's name",
    "return": "String",
    "args": []
  },
  {
    "name": "horse_tier",
    "aliases": [
      "h_tier"
    ],
    "description": "Your horse's tier",
    "return": "Integer",
    "args": []
  },
  {
    "name": "horse_xp",
    "aliases": [
      "h_xp"
    ],
    "description": "Your horse's current XP",
    "return": "Integer",
    "args": []
  },
  {
    "name": "accessory_durability",
    "aliases": [],
    "description": "Durability of the specified accessory",
    "return": "CappedValue",
    "args": [
      {
        "name": "accessory",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "all_shiny_stats",
    "aliases": [],
    "description": "Shows a list of all shiny stats",
    "return": "String",
    "args": []
  },
  {
    "name": "armor_durability",
    "aliases": [],
    "description": "Durability of the specified armor",
    "return": "CappedValue",
    "args": [
      {
        "name": "armor",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "capped_held_item_durability",
    "aliases": [],
    "description": "Durability of the item held in your main hand",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_ingredient_pouch_slots",
    "aliases": [],
    "description": "Used slots in the ingredient pouch",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "capped_inventory_slots",
    "aliases": [],
    "description": "Used slots in your inventory",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "emerald_block",
    "aliases": [
      "eb"
    ],
    "description": "Get the number of emerald blocks in your inventory",
    "return": "Integer",
    "args": []
  },
  {
    "name": "emerald_string",
    "aliases": [
      "estr"
    ],
    "description": "Get the value of all currency in your inventory, nicely formatted as LE/EB/E",
    "return": "String",
    "args": [
      {
        "name": "zeros",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "emeralds",
    "aliases": [
      "em"
    ],
    "description": "Amount of money in emeralds in inventory (Besides LE and EB)",
    "return": "Integer",
    "args": []
  },
  {
    "name": "held_item_cooldown",
    "aliases": [
      "held_cooldown,held_cd"
    ],
    "description": "Remaining cooldown ticks for the item in your hand",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "held_item_current_durability",
    "aliases": [
      "current_held_durability"
    ],
    "description": "Current durability of the item in your hand",
    "return": "Integer",
    "args": []
  },
  {
    "name": "held_item_max_durability",
    "aliases": [
      "max_held_durability"
    ],
    "description": "Max durability of the item in your hand",
    "return": "Integer",
    "args": []
  },
  {
    "name": "held_item_name",
    "aliases": [
      "held_item,held_name"
    ],
    "description": "Name of the item in your hand",
    "return": "String",
    "args": [
      {
        "name": "formatted",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "held_item_shiny_stat",
    "aliases": [],
    "description": "Shows the shiny stat of the item held in your main hand",
    "return": "NamedValue",
    "args": []
  },
  {
    "name": "held_item_type",
    "aliases": [
      "held_type"
    ],
    "description": "Type of the item in your hand",
    "return": "String",
    "args": []
  },
  {
    "name": "ingredient_pouch_ingredients",
    "aliases": [],
    "description": "Returns the amount of ingredients in your ingredient pouch according to the provided criteria",
    "return": "Integer",
    "args": [
      {
        "name": "name",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "ingredient_pouch_open_slots",
    "aliases": [
      "pouch_open,pouch_free"
    ],
    "description": "How many slots are currently open in your ingredient pouch.",
    "return": "Integer",
    "args": []
  },
  {
    "name": "ingredient_pouch_used_slots",
    "aliases": [
      "pouch_used"
    ],
    "description": "How many slots are currently used in your ingredient pouch.",
    "return": "Integer",
    "args": []
  },
  {
    "name": "inventory_free",
    "aliases": [
      "inv_free"
    ],
    "description": "Number of free slots in inventory",
    "return": "Integer",
    "args": []
  },
  {
    "name": "inventory_ingredients",
    "aliases": [],
    "description": "Returns the amount of ingredients in your inventory according to the provided criteria",
    "return": "Integer",
    "args": [
      {
        "name": "name",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "inventory_used",
    "aliases": [
      "inv_used"
    ],
    "description": "Number of used slots in inventory",
    "return": "Integer",
    "args": []
  },
  {
    "name": "item_count",
    "aliases": [
      "item_amount"
    ],
    "description": "Returns the total number of all items in inventory",
    "return": "Integer",
    "args": [
      {
        "name": "name",
        "type": "String",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "name": "liquid_emerald",
    "aliases": [
      "le"
    ],
    "description": "Amount of money liquid emeralds in inventory",
    "return": "Integer",
    "args": []
  },
  {
    "name": "material_count",
    "aliases": [],
    "description": "Count of materials in your inventory based on the given criteria",
    "return": "Integer",
    "args": [
      {
        "name": "name",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "tier",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "exact",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "money",
    "aliases": [],
    "description": "Total amount of money in inventory",
    "return": "Integer",
    "args": []
  },
  {
    "name": "chest_opened",
    "aliases": [
      "chest_count"
    ],
    "description": "Get the number of loot chests opened",
    "return": "Integer",
    "args": []
  },
  {
    "name": "chests_opened_this_session",
    "aliases": [
      "session_chests"
    ],
    "description": "Total number of chests you have opened this session, can be filtered by tier",
    "return": "Integer",
    "args": [
      {
        "name": "tier",
        "type": "Integer",
        "required": false,
        "default": "1"
      },
      {
        "name": "exact",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "dry_boxes",
    "aliases": [
      "dry_b,dry_boxes_count"
    ],
    "description": "Get the number of found gear boxes that has not been a mythic",
    "return": "Integer",
    "args": []
  },
  {
    "name": "dry_pulls",
    "aliases": [
      "dry_p,dry_pulls_count"
    ],
    "description": "Get the number of pulls that has not contained a mythic",
    "return": "Integer",
    "args": []
  },
  {
    "name": "dry_streak",
    "aliases": [
      "dry_s"
    ],
    "description": "Get the number of loot chests opened that has not contained a mythic",
    "return": "Integer",
    "args": []
  },
  {
    "name": "highest_dry_streak",
    "aliases": [],
    "description": "The highest dry streak that you had.",
    "return": "Integer",
    "args": []
  },
  {
    "name": "last_dry_streak",
    "aliases": [],
    "description": "The last dry streak that you had.",
    "return": "Integer",
    "args": []
  },
  {
    "name": "last_mythic",
    "aliases": [],
    "description": "The last mythic that you found in a loot chest.",
    "return": "String",
    "args": []
  },
  {
    "name": "lootrun_beacon_count",
    "aliases": [],
    "description": "The number of beacons you have selected in your lootrun",
    "return": "Integer",
    "args": [
      {
        "name": "color",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "lootrun_beacon_vibrant",
    "aliases": [],
    "description": "If the lootrun beacon is vibrant",
    "return": "Boolean",
    "args": [
      {
        "name": "color",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "lootrun_challenges",
    "aliases": [],
    "description": "The number of challenges",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "lootrun_last_selected_beacon_color",
    "aliases": [],
    "description": "The color of the beacon you have last selected in your lootrun",
    "return": "String",
    "args": []
  },
  {
    "name": "lootrun_last_selected_beacon_vibrant",
    "aliases": [],
    "description": "If the last selected beacon in your lootrun was vibrant or not",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "lootrun_mission",
    "aliases": [],
    "description": "The name of the Lootrun Mission at the given Index",
    "return": "String",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "colored",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "lootrun_next_orange_expire",
    "aliases": [],
    "description": "How many more challenges until the next orange beacon effect expires",
    "return": "Integer",
    "args": []
  },
  {
    "name": "lootrun_orange_beacon_count",
    "aliases": [],
    "description": "The number of orange beacon effects currently active",
    "return": "Integer",
    "args": []
  },
  {
    "name": "lootrun_rainbow_beacon_count",
    "aliases": [],
    "description": "How many more challenges until the rainbow beacon effect expires",
    "return": "Integer",
    "args": []
  },
  {
    "name": "lootrun_red_beacon_challenge_count",
    "aliases": [],
    "description": "The number of red beacon challenges you have remaining in your lootrun",
    "return": "Integer",
    "args": []
  },
  {
    "name": "lootrun_rerolls",
    "aliases": [],
    "description": "The number of rerolls you have in your current lootrun",
    "return": "Integer",
    "args": []
  },
  {
    "name": "lootrun_sacrifices",
    "aliases": [],
    "description": "The number of sacrifices you have in your current lootrun",
    "return": "Integer",
    "args": []
  },
  {
    "name": "lootrun_state",
    "aliases": [],
    "description": "The current state of the lootrun you are in. One of NOT_RUNNING, CHOOSING_BEACON, IN_TASK",
    "return": "String",
    "args": []
  },
  {
    "name": "lootrun_task_location",
    "aliases": [],
    "description": "The location of the task the beacon is pointing to",
    "return": "Location",
    "args": [
      {
        "name": "color",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "lootrun_task_name",
    "aliases": [],
    "description": "The name of the task the beacon is pointing to",
    "return": "String",
    "args": [
      {
        "name": "color",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "lootrun_task_type",
    "aliases": [],
    "description": "The type of the task the beacon is pointing to. One of LOOT, SLAY, TARGET, DESTROY, DEFEND, UNKNOWN",
    "return": "String",
    "args": [
      {
        "name": "color",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "lootrun_time",
    "aliases": [],
    "description": "The time left of current lootrun in seconds",
    "return": "Integer",
    "args": []
  },
  {
    "name": "lootrun_trial",
    "aliases": [],
    "description": "The name of the Lootrun Trial at the given Index",
    "return": "String",
    "args": [
      {
        "name": "index",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "dir",
    "aliases": [],
    "description": "Your current direction (heading)",
    "return": "Double",
    "args": []
  },
  {
    "name": "fps",
    "aliases": [],
    "description": "The current FPS (frames per second)",
    "return": "Integer",
    "args": []
  },
  {
    "name": "key_pressed",
    "aliases": [],
    "description": "Returns true if the specified key is currently pressed, false otherwise",
    "return": "Boolean",
    "args": [
      {
        "name": "keyCode",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "minecraft_effect_duration",
    "aliases": [],
    "description": "Returns the duration left of the specified Minecraft effect if it is currently active, -1 otherwise",
    "return": "Integer",
    "args": [
      {
        "name": "effectName",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "my_location",
    "aliases": [
      "my_loc"
    ],
    "description": "Your current location",
    "return": "Location",
    "args": []
  },
  {
    "name": "ticks",
    "aliases": [],
    "description": "The number of ticks since world start",
    "return": "Long",
    "args": []
  },
  {
    "name": "last_harvest_material_level",
    "aliases": [],
    "description": "The level of the material you last harvested",
    "return": "Integer",
    "args": []
  },
  {
    "name": "last_harvest_material_name",
    "aliases": [],
    "description": "The name of the material you last harvested",
    "return": "String",
    "args": []
  },
  {
    "name": "last_harvest_material_tier",
    "aliases": [],
    "description": "The tier of the material you last harvested",
    "return": "Integer",
    "args": []
  },
  {
    "name": "last_harvest_material_type",
    "aliases": [],
    "description": "The type of material you last harvested",
    "return": "String",
    "args": []
  },
  {
    "name": "last_harvest_resource_type",
    "aliases": [],
    "description": "The type of resource you last harvested",
    "return": "String",
    "args": []
  },
  {
    "name": "last_harvest_xp_gain",
    "aliases": [],
    "description": "The amount of gathering XP you gained from your last harvest",
    "return": "Float",
    "args": []
  },
  {
    "name": "last_profession_xp_gain",
    "aliases": [],
    "description": "The latest profession that you gained xp for",
    "return": "String",
    "args": []
  },
  {
    "name": "material_dry_streak",
    "aliases": [
      "mat_dry"
    ],
    "description": "Returns the number of times a material was not a T3 in a row.",
    "return": "Integer",
    "args": []
  },
  {
    "name": "profession_level",
    "aliases": [
      "prof_lvl"
    ],
    "description": "The level of the specified profession",
    "return": "Integer",
    "args": [
      {
        "name": "profession",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "profession_percentage",
    "aliases": [
      "prof_pct"
    ],
    "description": "Your current percentage for the profession specified",
    "return": "Double",
    "args": [
      {
        "name": "profession",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "profession_xp",
    "aliases": [
      "prof_xp"
    ],
    "description": "The XP of specified profession",
    "return": "CappedValue",
    "args": [
      {
        "name": "profession",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "profession_xp_per_minute",
    "aliases": [
      "prof_xpm"
    ],
    "description": "The amount of XP you gained for the specified profession in the last minute",
    "return": "String",
    "args": [
      {
        "name": "profession",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "profession_xp_per_minute_raw",
    "aliases": [
      "prof_xpm_raw"
    ],
    "description": "The raw amount of XP you gained for the specified profession in the last minute",
    "return": "Integer",
    "args": [
      {
        "name": "profession",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "current_raid_boss_count",
    "aliases": [],
    "description": "How many bosses does the current raid have",
    "return": "Integer",
    "args": []
  },
  {
    "name": "current_raid_challenge_count",
    "aliases": [],
    "description": "How many challenges does the current raid have",
    "return": "Integer",
    "args": []
  },
  {
    "name": "current_raid_damage",
    "aliases": [
      "raid_damage"
    ],
    "description": "How much damage have you dealt in the current raid",
    "return": "Long",
    "args": []
  },
  {
    "name": "current_raid",
    "aliases": [
      "raid"
    ],
    "description": "The name of the raid you are currently in",
    "return": "String",
    "args": []
  },
  {
    "name": "current_raid_room_damage",
    "aliases": [],
    "description": "How much damage have you dealt in the current raid room",
    "return": "Long",
    "args": []
  },
  {
    "name": "current_raid_room_name",
    "aliases": [],
    "description": "The name of the challenge raid room you are currently in",
    "return": "String",
    "args": []
  },
  {
    "name": "current_raid_room_start",
    "aliases": [],
    "description": "The time when the current raid room started",
    "return": "Time",
    "args": []
  },
  {
    "name": "current_raid_room_time",
    "aliases": [],
    "description": "How long you have been in the current raid room for in milliseconds",
    "return": "Long",
    "args": []
  },
  {
    "name": "current_raid_start",
    "aliases": [
      "raid_start"
    ],
    "description": "The time when the current raid started",
    "return": "Time",
    "args": []
  },
  {
    "name": "current_raid_time",
    "aliases": [
      "raid_time"
    ],
    "description": "How long you have been in the current raid for in milliseconds",
    "return": "Long",
    "args": []
  },
  {
    "name": "dry_aspects",
    "aliases": [],
    "description": "Dry Aspects",
    "return": "Integer",
    "args": []
  },
  {
    "name": "dry_raid_reward_pulls",
    "aliases": [],
    "description": "Dry Raid Reward Pulls",
    "return": "Integer",
    "args": []
  },
  {
    "name": "dry_raids_aspects",
    "aliases": [],
    "description": "Dry Raids Aspects",
    "return": "Integer",
    "args": []
  },
  {
    "name": "dry_raids_tomes",
    "aliases": [],
    "description": "Dry Raids Tomes",
    "return": "Integer",
    "args": []
  },
  {
    "name": "raid_challenges",
    "aliases": [],
    "description": "The number of challenges in the raid",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "raid_has_room",
    "aliases": [],
    "description": "Has the current raid got a room for the given room number?",
    "return": "Boolean",
    "args": [
      {
        "name": "roomNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "raid_intermission_time",
    "aliases": [],
    "description": "How long you have been outside of a challenge/boss room in milliseconds",
    "return": "Long",
    "args": []
  },
  {
    "name": "raid_is_boss_room",
    "aliases": [],
    "description": "Is the given room number a boss room in the current raid?",
    "return": "Boolean",
    "args": [
      {
        "name": "roomNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "raid_personal_best_time",
    "aliases": [
      "raid_pb"
    ],
    "description": "The fastest time taken to beat the specified raid in milliseconds",
    "return": "Long",
    "args": [
      {
        "name": "raidName",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "raid_room_damage",
    "aliases": [],
    "description": "How much damage did you deal in the specified raid room",
    "return": "Long",
    "args": [
      {
        "name": "roomNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "raid_room_name",
    "aliases": [],
    "description": "The name of the specified raid room",
    "return": "String",
    "args": [
      {
        "name": "roomNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "raid_room_start",
    "aliases": [],
    "description": "The time when the specified raid room started",
    "return": "Time",
    "args": [
      {
        "name": "roomNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "raid_room_time",
    "aliases": [],
    "description": "How long it took to complete the specified raid room in milliseconds",
    "return": "Long",
    "args": [
      {
        "name": "roomNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "raid_time_remaining",
    "aliases": [],
    "description": "How much time is left to complete the raid in seconds",
    "return": "Integer",
    "args": []
  },
  {
    "name": "raids_runs_since",
    "aliases": [],
    "description": "The total amount of raids you ran in last specified days",
    "return": "Integer",
    "args": [
      {
        "name": "sinceDays",
        "type": "Integer",
        "required": false,
        "default": "7"
      }
    ]
  },
  {
    "name": "specific_raid_runs_since",
    "aliases": [],
    "description": "The total amount of specified raid you ran in last specified days",
    "return": "Integer",
    "args": [
      {
        "name": "raidName",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "sinceDays",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "range_high",
    "aliases": [
      "high"
    ],
    "description": "The high value of the range",
    "return": "Integer",
    "args": [
      {
        "name": "range",
        "type": "RangedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "range_low",
    "aliases": [
      "low"
    ],
    "description": "The low value of the range",
    "return": "Integer",
    "args": [
      {
        "name": "range",
        "type": "RangedValue",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "ranged",
    "aliases": [],
    "description": "Creates a range from two values",
    "return": "RangedValue",
    "args": [
      {
        "name": "low",
        "type": "Integer",
        "required": true,
        "default": null
      },
      {
        "name": "high",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "friends",
    "aliases": [],
    "description": "Number of friends online",
    "return": "Integer",
    "args": []
  },
  {
    "name": "is_friend",
    "aliases": [],
    "description": "Whether specified player is your friend or not",
    "return": "Boolean",
    "args": [
      {
        "name": "player",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "is_party_member",
    "aliases": [],
    "description": "Whether specified player is in your party",
    "return": "Boolean",
    "args": [
      {
        "name": "player",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "party_leader",
    "aliases": [],
    "description": "The name of the party leader",
    "return": "String",
    "args": []
  },
  {
    "name": "party_members",
    "aliases": [],
    "description": "Number of party members",
    "return": "Integer",
    "args": [
      {
        "name": "includeOffline",
        "type": "Boolean",
        "required": false,
        "default": "true"
      }
    ]
  },
  {
    "name": "player_name",
    "aliases": [],
    "description": "Your username",
    "return": "String",
    "args": []
  },
  {
    "name": "wynntils_role",
    "aliases": [],
    "description": "Your Wynntils role",
    "return": "String",
    "args": []
  },
  {
    "name": "arrow_shield_count",
    "aliases": [
      "arrow_shield"
    ],
    "description": "The number of arrow shield charges you have",
    "return": "Integer",
    "args": []
  },
  {
    "name": "guardian_angels_count",
    "aliases": [
      "guardian_angels"
    ],
    "description": "The number of guardian angel charges you have",
    "return": "Integer",
    "args": []
  },
  {
    "name": "mantle_shield_count",
    "aliases": [
      "mantle_shield"
    ],
    "description": "The number of mantle shield charges you have",
    "return": "Integer",
    "args": []
  },
  {
    "name": "shaman_mask",
    "aliases": [],
    "description": "What shaman mask you are currently wearing",
    "return": "String",
    "args": [
      {
        "name": "isColored",
        "type": "Boolean",
        "required": false,
        "default": "true"
      },
      {
        "name": "useShortName",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "shaman_totem_distance",
    "aliases": [],
    "description": "The distance between you and the shaman totem",
    "return": "Double",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "shaman_totem_location",
    "aliases": [],
    "description": "The location of the shaman totem",
    "return": "String",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "shaman_totem_state",
    "aliases": [],
    "description": "The state of the shaman totem. One of SUMMONED, ACTIVE",
    "return": "String",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "shaman_totem_time_left",
    "aliases": [],
    "description": "The time left on the shaman totem",
    "return": "Integer",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "shield_type_name",
    "aliases": [
      "shield_type"
    ],
    "description": "The name of the current active shield type, currently one of \"Arrow\", \"Guardian Angels\" or \"Mantle\"",
    "return": "String",
    "args": []
  },
  {
    "name": "statistics_average",
    "aliases": [],
    "description": "Average value of the statistical entries",
    "return": "Long",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_count",
    "aliases": [],
    "description": "Count of statistical entries",
    "return": "Long",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_first_modified",
    "aliases": [],
    "description": "First modification date among the statistical entries",
    "return": "Long",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_first_modified_time",
    "aliases": [],
    "description": "First modification time among the statistical entries",
    "return": "Time",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_formatted",
    "aliases": [],
    "description": "Format numbers the way the statistic kind does",
    "return": "String",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "value",
        "type": "Number",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_last_modified",
    "aliases": [],
    "description": "Last modification date among the statistical entries",
    "return": "Long",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_last_modified_time",
    "aliases": [],
    "description": "Last modification time among the statistical entries",
    "return": "Time",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_max",
    "aliases": [],
    "description": "Maximum value among the statistical entries",
    "return": "Long",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_min",
    "aliases": [],
    "description": "Minimum value among the statistical entries",
    "return": "Long",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "statistics_total",
    "aliases": [],
    "description": "Total of all statistical entries",
    "return": "Long",
    "args": [
      {
        "name": "statisticKey",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "overall",
        "type": "Boolean",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "status_effect_active",
    "aliases": [
      "contains_effect"
    ],
    "description": "Checks if an effect is contained in the status effect list",
    "return": "Boolean",
    "args": [
      {
        "name": "query",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "status_effect_duration",
    "aliases": [],
    "description": "Searches for given status effect and returns a NamedValue with the name and duration in seconds. If none were found the name will be empty, if the duration is infinite -1 will be returned",
    "return": "NamedValue",
    "args": [
      {
        "name": "query",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "status_effect_modifier",
    "aliases": [],
    "description": "Searches for given status effect and returns a NamedValue with type of modifier and its value. If none were found the name will be empty",
    "return": "NamedValue",
    "args": [
      {
        "name": "query",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "status_effect_prefix",
    "aliases": [],
    "description": "Searches for given status effect and returns a String with the prefix. If none were found it will be empty string",
    "return": "String",
    "args": [
      {
        "name": "query",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "status_effects",
    "aliases": [],
    "description": "Retrieves the full list of status effects",
    "return": "String",
    "args": []
  },
  {
    "name": "aura_timer",
    "aliases": [],
    "description": "The time left before aura strikes",
    "return": "Double",
    "args": []
  },
  {
    "name": "current_tower_attack_speed",
    "aliases": [],
    "description": "The attack speed of the current tower you are attacking",
    "return": "Double",
    "args": []
  },
  {
    "name": "current_tower_damage",
    "aliases": [],
    "description": "The damage of the current tower you are attacking",
    "return": "RangedValue",
    "args": []
  },
  {
    "name": "current_tower_defense",
    "aliases": [],
    "description": "The defense of the current tower you are attacking",
    "return": "Double",
    "args": []
  },
  {
    "name": "current_tower_health",
    "aliases": [],
    "description": "The health of the current tower you are attacking",
    "return": "Long",
    "args": []
  },
  {
    "name": "estimated_time_to_finish_war",
    "aliases": [],
    "description": "The estimated time to finish the war you are currently in",
    "return": "Long",
    "args": []
  },
  {
    "name": "estimated_war_end",
    "aliases": [],
    "description": "The estimated time to the current war will end",
    "return": "Time",
    "args": []
  },
  {
    "name": "initial_tower_attack_speed",
    "aliases": [],
    "description": "The attack speed of the initial tower you are attacking",
    "return": "Double",
    "args": []
  },
  {
    "name": "initial_tower_damage",
    "aliases": [],
    "description": "The damage of the initial tower you are attacking",
    "return": "RangedValue",
    "args": []
  },
  {
    "name": "initial_tower_defense",
    "aliases": [],
    "description": "The defense of the initial tower you are attacking",
    "return": "Double",
    "args": []
  },
  {
    "name": "initial_tower_health",
    "aliases": [],
    "description": "The health of the initial tower you are attacking",
    "return": "Long",
    "args": []
  },
  {
    "name": "is_territory_queued",
    "aliases": [
      "is_queued"
    ],
    "description": "Is the specified territory queued for an attack?",
    "return": "Boolean",
    "args": [
      {
        "name": "territoryName",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "team_dps",
    "aliases": [],
    "description": "The DPS of your team in the war you are currently in",
    "return": "Long",
    "args": [
      {
        "name": "seconds",
        "type": "Long",
        "required": false,
        "default": "9223372036854775807"
      }
    ]
  },
  {
    "name": "time_in_war",
    "aliases": [],
    "description": "The time you have been in the war you are currently in",
    "return": "Long",
    "args": []
  },
  {
    "name": "tower_dps",
    "aliases": [],
    "description": "The DPS of the tower you are currently attacking",
    "return": "RangedValue",
    "args": []
  },
  {
    "name": "tower_effective_hp",
    "aliases": [],
    "description": "The effective HP of the tower you are currently attacking",
    "return": "Long",
    "args": []
  },
  {
    "name": "tower_owner",
    "aliases": [],
    "description": "The owner of the tower you are attacking",
    "return": "String",
    "args": []
  },
  {
    "name": "tower_territory",
    "aliases": [],
    "description": "The territory of the tower you are attacking",
    "return": "String",
    "args": []
  },
  {
    "name": "volley_timer",
    "aliases": [],
    "description": "The time left before volley strikes",
    "return": "Double",
    "args": []
  },
  {
    "name": "war_start",
    "aliases": [],
    "description": "The time the current war started",
    "return": "Time",
    "args": []
  },
  {
    "name": "wars_since",
    "aliases": [],
    "description": "The number of wars in the specified time period",
    "return": "Long",
    "args": [
      {
        "name": "sinceDays",
        "type": "Integer",
        "required": false,
        "default": "7"
      }
    ]
  },
  {
    "name": "annihilation_dry_count",
    "aliases": [
      "dry_annis,dry_anni_count"
    ],
    "description": "Get the number of annihilation world events completed that has not contained a corrupted cache",
    "return": "Integer",
    "args": []
  },
  {
    "name": "annihilation_sun_progress",
    "aliases": [
      "sun_progress"
    ],
    "description": "The progress towards a new sun being created during the Annihilation battle",
    "return": "CappedValue",
    "args": []
  },
  {
    "name": "current_world_event",
    "aliases": [],
    "description": "Get the name of the world event you are currently in",
    "return": "String",
    "args": []
  },
  {
    "name": "current_world_event_start_time",
    "aliases": [],
    "description": "Get the start time of the current world event",
    "return": "Time",
    "args": []
  },
  {
    "name": "world_event_start_time",
    "aliases": [],
    "description": "Get the start time of the given world event",
    "return": "Time",
    "args": [
      {
        "name": "worldEventName",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "current_territory",
    "aliases": [
      "territory"
    ],
    "description": "The territory you are currently in",
    "return": "String",
    "args": []
  },
  {
    "name": "current_territory_owner",
    "aliases": [
      "territory_owner"
    ],
    "description": "The name or prefix of the guild that owns the territory you are currently in",
    "return": "String",
    "args": [
      {
        "name": "prefixOnly",
        "type": "Boolean",
        "required": false,
        "default": "false"
      }
    ]
  },
  {
    "name": "current_world",
    "aliases": [
      "world"
    ],
    "description": "Get the name of the current world, such as \"WC32\", may be <unknown> or <not on world>",
    "return": "String",
    "args": []
  },
  {
    "name": "gathering_totem_count",
    "aliases": [],
    "description": "The number of gathering totems around you",
    "return": "Integer",
    "args": []
  },
  {
    "name": "gathering_totem_distance",
    "aliases": [],
    "description": "The distance to the gathering totem",
    "return": "Double",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "gathering_totem",
    "aliases": [],
    "description": "The location of the gathering totem",
    "return": "Location",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "gathering_totem_owner",
    "aliases": [],
    "description": "The name of the player who placed the gathering totem",
    "return": "String",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "gathering_totem_time_left",
    "aliases": [],
    "description": "The time left on the gathering totem",
    "return": "String",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "in_mapped_area",
    "aliases": [],
    "description": "Are you currently inside a mapped area?",
    "return": "Boolean",
    "args": [
      {
        "name": "width",
        "type": "Number",
        "required": false,
        "default": "130"
      },
      {
        "name": "height",
        "type": "Number",
        "required": false,
        "default": "130"
      },
      {
        "name": "scale",
        "type": "Number",
        "required": false,
        "default": "1"
      }
    ]
  },
  {
    "name": "in_stream",
    "aliases": [
      "streamer"
    ],
    "description": "Are you currently in streamer mode?",
    "return": "Boolean",
    "args": []
  },
  {
    "name": "mob_totem_count",
    "aliases": [],
    "description": "The number of mob totems around you",
    "return": "Integer",
    "args": []
  },
  {
    "name": "mob_totem_distance",
    "aliases": [],
    "description": "The distance to the mob totem",
    "return": "Double",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "mob_totem",
    "aliases": [],
    "description": "The location of the mob totem",
    "return": "Location",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "mob_totem_owner",
    "aliases": [],
    "description": "The name of the player who placed the mob totem",
    "return": "String",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "mob_totem_time_left",
    "aliases": [],
    "description": "The time left on the mob totem",
    "return": "String",
    "args": [
      {
        "name": "totemNumber",
        "type": "Integer",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "newest_world",
    "aliases": [],
    "description": "The newest world there is on Wynncraft",
    "return": "String",
    "args": []
  },
  {
    "name": "ping",
    "aliases": [],
    "description": "Your ping to the Wynncraft server",
    "return": "Integer",
    "args": []
  },
  {
    "name": "token_gatekeeper_count",
    "aliases": [
      "token_count"
    ],
    "description": "The number of tokens gatekeepers present",
    "return": "Integer",
    "args": []
  },
  {
    "name": "token_gatekeeper_deposited",
    "aliases": [
      "token_dep"
    ],
    "description": "The number of tokens deposited to a gatekeeper",
    "return": "CappedValue",
    "args": [
      {
        "name": "gatekeeperNumber",
        "type": "Integer",
        "required": false,
        "default": "0"
      }
    ]
  },
  {
    "name": "token_gatekeeper",
    "aliases": [
      "token"
    ],
    "description": "The number of tokens collected to get past a gatekeeper",
    "return": "CappedValue",
    "args": [
      {
        "name": "gatekeeperNumber",
        "type": "Integer",
        "required": false,
        "default": "0"
      }
    ]
  },
  {
    "name": "token_gatekeeper_type",
    "aliases": [
      "token_type"
    ],
    "description": "The type of tokens needed to get past a gatekeeper",
    "return": "String",
    "args": [
      {
        "name": "gatekeeperNumber",
        "type": "Integer",
        "required": false,
        "default": "0"
      }
    ]
  },
  {
    "name": "world_state",
    "aliases": [],
    "description": "The current world state. One of NOT_CONNECTED, CONNECTING, INTERIM, HUB, CHARACTER_SELECTION, WORLD",
    "return": "String",
    "args": []
  },
  {
    "name": "world_uptime",
    "aliases": [
      "uptime,current_world_uptime"
    ],
    "description": "The time the world has been up for",
    "return": "String",
    "args": [
      {
        "name": "worldName",
        "type": "String",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "name": "transcribe_gavellian",
    "aliases": [
      "gavellian"
    ],
    "description": "Transcribe your given input into Gavellian.",
    "return": "String",
    "args": [
      {
        "name": "gavellian",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "transcribe_wynnic",
    "aliases": [
      "wynnic"
    ],
    "description": "Transcribe your given input into Wynnic.",
    "return": "String",
    "args": [
      {
        "name": "wynnic",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "to_background_text",
    "aliases": [],
    "description": "Converts the text to use Wynncraft background style.",
    "return": "String",
    "args": [
      {
        "name": "text",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "textColor",
        "type": "CustomColor",
        "required": true,
        "default": null
      },
      {
        "name": "backgroundColor",
        "type": "CustomColor",
        "required": true,
        "default": null
      },
      {
        "name": "leftEdge",
        "type": "String",
        "required": true,
        "default": null
      },
      {
        "name": "rightEdge",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  },
  {
    "name": "to_fancy_text",
    "aliases": [],
    "description": "Converts the text to use Wynncraft Fancy style.",
    "return": "String",
    "args": [
      {
        "name": "text",
        "type": "String",
        "required": true,
        "default": null
      }
    ]
  }
];
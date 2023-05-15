# Unicode Math Input For VSCode

A fast and intuitive way to insert unicode math characters (and even Emoji 😯) using LaTeX command in any document!

**Disclaimer**: This extension is still under active development, 
all configurations/functionalities are subject to radical change until the 1.0 release. 
However, I will try my best to make configuration backward compatible if possible.

# Install And Info

## From OpenVSX

[![Open VSX Version](https://img.shields.io/open-vsx/v/czhang03/unicode-math-input)](https://open-vsx.org/extension/czhang03/unicode-math-input/)
[![Open VSX Rating](https://img.shields.io/open-vsx/rating/czhang03/unicode-math-input)](https://open-vsx.org/extension/czhang03/unicode-math-input/)

## From VSCode Marketplace

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/czhang03.unicode-math-input)](https://marketplace.visualstudio.com/items?itemName=czhang03.unicode-math-input)
[![Visual Studio Marketplace Last Updated](https://img.shields.io/visual-studio-marketplace/last-updated/czhang03.unicode-math-input)](https://marketplace.visualstudio.com/items?itemName=czhang03.unicode-math-input)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/czhang03.unicode-math-input)](https://marketplace.visualstudio.com/items?itemName=czhang03.unicode-math-input)

## From GitHub Release

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/czhang03/unicode-math-vscode)](https://github.com/czhang03/unicode-math-vscode/releases)
[![CodeQL](https://github.com/czhang03/unicode-math-vscode/actions/workflows/codeql.yml/badge.svg)](https://github.com/czhang03/unicode-math-vscode/actions/workflows/codeql.yml)


# Features

## Autocompletion

In any language, when you type `\`, this extension will start suggesting possible latex input. 
Autocompletion will also preview the character that you are currently typing

**NOTICE**, when [LaTeX Workshop](https://github.com/James-Yu/LaTeX-Workshop) is activated, 
the `\` trigger seems to be taken by LaTeX Workshop, 
you can set [custom trigger string](#custom-trigger-string) in the setting. 
I personally set the trigger strings as `["\", ";"]` in my LaTeX project. 


## Tab Commit (deprecated)

We are phasing out tab commit, it will be disabled in next minor version for better experience. 

Reasons to deprecate tab commit:

Rebinding key do not work, 
since we need to propagate the corresponding key press if the commit is unsuccessful.
We can create command for all the keys that need to propagate 
(one for space, one for tab, and other keys that don't need to propagate),
but that is not a good user experience.

Tab commit is also not a good experience in general, 
it is one more key to press to commit a command. 

Tab commits has key conflict with completion, which is a very useful and essential feature.

We will replace it with a auto commit feature, 
which will automatically commit all committable symbol as you type.
And of course this will be able to be turned off by setting, per file, or per line. 

## Custom Trigger String

User can set custom trigger string from setting besides `\`.
they can be any strings, even `"LaTeX"`, and there can be multiple ones.
To disable this extension (typically used in LaTeX workspace),
just set the trigger strings to empty list.

## Custom Font Command 

By default there is following font command:

| font command  | font |
| --- | --- |
| `^`  | superscript |
| `sup`  | superscript |
| `_`  | subscript |
| `sub`  | subscript |
|`b` | bold |
|`bf` | bold |
|`mbf` | bold |
|`mathbf` | bold |
|`i` | italic |
|`it` | italic |
|`mit` | italic |
|`mathit` | italic |
|`cal` | `\mathcal` |
|`mcal` | `\mathcal` |
|`mathcal` | `\mathcal` |
|`frak` | `\mathfrak` |
|`mfrak` | `\mathfrak` |
|`mathfrak` | `\mathfrak` |
|`bb` | `\mathbb` |
|`Bbb` | `\mathbb` |
|`mbb` | `\mathbb` |
|`mathbb` | `\mathbb` |
|`sf` | `\mathsf` |
|`msf:` | `\mathsf` |
|`mathsf` | `\mathsf` |
|`tt` | `\mathtt` |
|`mtt` | `\mathtt` |
|`mathtt` | `\mathtt` |
|`scr` | `\mathscr` |
|`mscr` | `\mathscr` |
|`mathscr` | `\mathscr` |

When you type a trigger string (like `\`) followed by 
the extension will commit the unicode version of that font.
For example `\it{ABC}` will be committed to `𝐴𝐵𝐶`.

**NOTICE**: not all math font (including super and subscript) of common characters are supported in unicode.
When the char do not have the math font, the extension will not convert anything. 

### Diagnostics

The extension will show diagnostics for texts that can be converted to unicode, 
and provide code action to convert them to unicode. 
This can be disabled per line by: adding `UNICODE-MATH-INPUT: Do not warn current line` to a line. 

In the future there will be ways to disable per file, by setting, or disable/enable it until/from a certain line.

Known Issue: When a command is preceded/followed by characters in `|()[]:!#$%&*+./<=>?@^-~\;{}`,
since all of these are valid characters in a command. 
For example the `\top` in `(\top)` or the `\sigma` in `\sigma_{}` will not be recognized by the diagnostic. 

### Disable in language

This extension can be configured to be dynamically disabled in all files with some language ids. 

# License

This extension is licensed under LGPLv3.0,
because the license of [ibus-latex-table](https://github.com/moebiuscurve/ibus-table-others/blob/main/tables/latex.txt) is under LGPL

# Acknowledgement 

This project is a rewrite of [Fast Unicode Math Characters](https://github.com/gatapia/unicode-math-input)
by [Guido Tapia](https://github.com/gatapia). 

The mapping from latex to unicode is provided by 

- [UnicodeMath](https://github.com/mvoidex/UnicodeMath), which inspired [Fast Unicode Math Characters](https://github.com/gatapia/unicode-math-input)
- [Fast Unicode Math Characters](https://github.com/gatapia/unicode-math-input)
- [ibus-latex-table](https://github.com/moebiuscurve/ibus-table-others/blob/main/tables/latex.txt)
- [unicode-math LaTeX Package](https://github.com/wspr/unicode-math/)

The icon is provided by [Material Design Icons](https://pictogrammers.com/library/mdi/icon/math-integral/), 
released under Apache2.0 license.

This project is definitely not possible without these projects.


# Roadmap

- [ ] auto-commit instead of tab commit. 
- [ ] disable diagnostics per file.
- [ ] disable/enable feature from/until a certain line
- [ ] push a warning when commit failed with font command.
- [ ] Combine font command, like bold italic etc.
- [ ] make the subscript `_` and superscript `^` special trigger strings
- [ ] custom symbols.
- [ ] detect custom font/symbol has overlap.
- [ ] detect testing environment and raise error for code that should not be reachable.
- [ ] reverse search font command or latex command.
- [ ] automated CI documentation.
- [ ] automatically pull character from upstream.
- [ ] automatically PR to upstream.
- [ ] Screenshots/GIF on the readme.
- [ ] more tests.
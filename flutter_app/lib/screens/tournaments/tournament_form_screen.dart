// Create a tournament, or edit it (creator, before it starts): name, rules, size, format, start time, breaks.
import 'dart:math';
import 'package:flutter/material.dart';
import '../../api/api_client.dart';
import '../../api/endpoints.dart';
import '../../models.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../utils/pick_date_time.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import 'tournament_detail_screen.dart';

class TournamentFormScreen extends StatefulWidget {
  final int? tournamentId; // null = create a new one
  const TournamentFormScreen({super.key, this.tournamentId});
  @override
  State<TournamentFormScreen> createState() => _TournamentFormScreenState();
}

class _TournamentFormScreenState extends State<TournamentFormScreen> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  List<RuleSet> _ruleSets = [];
  int _ruleSetId = 3;
  int _maxPlayers = 4;
  int _perMatch = 2;
  DateTime _startTime = DateTime.now().add(const Duration(minutes: 15));
  int _breakMinutes = 2;
  bool _join = true;
  bool _loaded = false;
  bool _saving = false;
  String? _error;

  bool get _editing => widget.tournamentId != null;

  @override
  void initState() {
    super.initState();
    MatchApi.ruleSets().then((r) => setState(() => _ruleSets = r)).catchError((_) {});
    if (!_editing) {
      _loaded = true;
      return;
    }
    // Editing: fill the form with the current values
    TournamentApi.detail(widget.tournamentId!).then((d) {
      final t = d.tournament;
      setState(() {
        _name.text = t.name;
        _description.text = t.description ?? '';
        _ruleSetId = t.ruleSetId;
        _maxPlayers = t.maxParticipants;
        _perMatch = t.playersPerMatch;
        _startTime = t.startTime;
        _breakMinutes = t.roundBreakMinutes;
        _loaded = true;
      });
    }).catchError((err) {
      showError(err);
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _chooseTime() async {
    final picked = await pickDateTime(context, _startTime);
    if (picked != null) setState(() => _startTime = picked);
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) return setState(() => _error = 'Give your tournament a name');
    if (!_startTime.isAfter(DateTime.now())) return setState(() => _error = 'The start time must be in the future');
    setState(() {
      _error = null;
      _saving = true;
    });
    final body = <String, dynamic>{
      'name': _name.text.trim(),
      'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
      'rule_set_id': _ruleSetId,
      'max_participants': _maxPlayers,
      'players_per_match': _perMatch,
      'start_time': _startTime.toUtc().toIso8601String(),
      'round_break_minutes': _breakMinutes,
    };
    try {
      if (_editing) {
        await TournamentApi.update(widget.tournamentId!, body);
        showToast('Tournament updated', message: 'Players were notified', kind: ToastKind.success);
        if (mounted) Navigator.of(context).pop();
      } else {
        final t = await TournamentApi.create({...body, 'join': _join});
        showToast('Tournament created!', message: 'Now invite your friends', kind: ToastKind.success);
        if (mounted) Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => TournamentDetailScreen(tournamentId: t.tournamentId)));
      }
    } catch (err) {
      setState(() {
        _error = errorText(err);
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded) {
      return const Scaffold(body: AppBackground(child: Column(children: [AppHeader(title: 'Edit Tournament'), Expanded(child: LoadingView())])));
    }
    final rounds = (log(_maxPlayers) / log(_perMatch)).ceil();

    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          AppHeader(title: _editing ? 'Edit Tournament' : 'New Tournament', subtitle: _editing ? 'Changes are sent to all players' : 'You are the organiser'),
          Expanded(
            child: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 40), children: [
              GlassCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  AppTextField(label: 'Name', hint: 'Friday Night Cup', icon: Icons.emoji_events, controller: _name, maxLength: 100),
                  AppTextField(label: 'Description (optional)', hint: 'Prize, rules, anything…', icon: Icons.notes, controller: _description, maxLength: 255),
                  OptionPicker<int>(
                    label: 'Players',
                    value: _maxPlayers,
                    options: [for (final n in [2, 4, 8, 16]) Option('$n', n)],
                    onChanged: (n) => setState(() => _maxPlayers = n),
                  ),
                  OptionPicker<int>(
                    label: 'Match format',
                    value: _perMatch,
                    options: const [Option('1 vs 1', 2, hint: 'classic knockout'), Option('4 players', 4, hint: 'winner advances')],
                    onChanged: (n) => setState(() => _perMatch = n),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text('≈ $rounds round${rounds > 1 ? 's' : ''} to crown a champion', style: const TextStyle(color: AppColors.gold, fontSize: 13, fontWeight: FontWeight.w700)),
                  ),
                  if (_ruleSets.isNotEmpty)
                    OptionPicker<int>(
                      label: 'Rules',
                      value: _ruleSetId,
                      options: [for (final r in _ruleSets) Option(r.name, r.ruleSetId, hint: r.hint)],
                      onChanged: (id) => setState(() => _ruleSetId = id),
                    ),
                  const Padding(padding: EdgeInsets.only(bottom: 8), child: Text('START TIME', style: AppText.label)),
                  GradientButton(title: formatDateTime(_startTime), icon: Icons.event, variant: ButtonVariant.ghost, size: ButtonSize.md, onPressed: _chooseTime),
                  const SizedBox(height: 10),
                  Row(children: [
                    for (final q in const [('+5 min', 5), ('+15 min', 15), ('+1 hour', 60), ('Tomorrow', 1440)]) ...[
                      Expanded(
                        child: GradientButton(
                          title: q.$1,
                          size: ButtonSize.sm,
                          variant: ButtonVariant.ghost,
                          onPressed: () => setState(() => _startTime = DateTime.now().add(Duration(minutes: q.$2))),
                        ),
                      ),
                      if (q.$2 != 1440) const SizedBox(width: 6),
                    ],
                  ]),
                  const SizedBox(height: 18),
                  OptionPicker<int>(
                    label: 'Break between rounds',
                    value: _breakMinutes,
                    options: [for (final n in [1, 2, 5, 10]) Option('$n min', n)],
                    onChanged: (n) => setState(() => _breakMinutes = n),
                  ),
                  if (!_editing)
                    OptionPicker<bool>(
                      label: 'Do you play too?',
                      value: _join,
                      options: const [Option('🎮 Yes, I play', true), Option('👀 Only organise', false)],
                      onChanged: (v) => setState(() => _join = v),
                    ),
                  if (_error != null)
                    Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700))),
                  GradientButton(title: _editing ? 'Save Changes' : 'Create Tournament', icon: Icons.save, variant: ButtonVariant.gold, loading: _saving, onPressed: _save),
                ]),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}
